import os
import tempfile
import unittest
from unittest.mock import patch

import app as nova
import chat_store


class QuizHistoryTests(unittest.TestCase):
    def setUp(self):
        nova.app.config['TESTING'] = True
        self.temp = tempfile.TemporaryDirectory()
        self.old_db = nova.app.config['CHAT_DATABASE']
        with patch.dict(os.environ, {'CHAT_DATABASE': os.path.join(self.temp.name, 'test.sqlite3')}):
            chat_store.init_store(nova.app)
        self.client = nova.app.test_client()
        self.mock_ai = patch('app.gemini_response', return_value=None)
        self.mock_ai.start()

    def tearDown(self):
        self.mock_ai.stop()
        nova.app.config['CHAT_DATABASE'] = self.old_db
        self.temp.cleanup()

    def send(self, message, conversation_id=None):
        response = self.client.post('/api/chat', json={'message': message, 'conversation_id': conversation_id})
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def test_quizzes_match_each_requested_topic(self):
        for topic in ('Python', 'Java', 'JavaScript', 'HTML', 'CSS', 'DBMS', 'SQL'):
            with self.subTest(topic=topic):
                self.assertTrue(self.send('hi, give me a ' + topic + ' quiz')['reply'].startswith(topic + ' quiz'))

    def test_unknown_topic_never_returns_random_quiz(self):
        self.assertIn('Please ask for one of these topics', self.send('give me a physics quiz')['reply'])

    def test_saved_chat_can_be_loaded_and_continued(self):
        first = self.send('give me python quiz')
        cid = first['conversation_id']
        result = self.client.get('/api/conversations/' + cid).get_json()
        self.assertEqual([m['role'] for m in result['messages']], ['user', 'assistant'])
        self.assertIn('Python quiz', result['messages'][1]['content'])
        self.assertIn('Correct!', self.send('B', cid)['reply'])
        self.assertEqual(len(self.client.get('/api/conversations/' + cid).get_json()['messages']), 4)
        self.assertEqual(self.client.get('/api/conversations').get_json()['conversations'][0]['id'], cid)

    def test_quiz_state_is_separate_for_each_conversation(self):
        python = self.send('python quiz')['conversation_id']
        html = self.send('html quiz')['conversation_id']
        self.assertIn('Correct!', self.send('B', python)['reply'])
        self.assertIn('Correct!', self.send('C', html)['reply'])

    def test_other_browser_cannot_read_or_append_history(self):
        cid = self.send('hello')['conversation_id']
        stranger = nova.app.test_client()
        self.assertEqual(stranger.get('/api/conversations').get_json()['conversations'], [])
        self.assertEqual(stranger.get('/api/conversations/' + cid).status_code, 404)
        self.assertEqual(stranger.post('/api/chat', json={'message': 'hi', 'conversation_id': cid}).status_code, 404)

    def test_new_conversation_does_not_inherit_quiz(self):
        self.send('python quiz')
        self.assertNotIn('Correct!', self.send('B')['reply'])

    def test_history_survives_reinitializing_database(self):
        cid = self.send('hello')['conversation_id']
        with patch.dict(os.environ, {'CHAT_DATABASE': nova.app.config['CHAT_DATABASE']}):
            chat_store.init_store(nova.app)
        self.assertEqual(self.client.get('/api/conversations/' + cid).status_code, 200)

    def test_expired_chat_and_messages_are_deleted(self):
        old = self.send('python quiz')['conversation_id']
        fresh = self.send('hello')['conversation_id']
        with nova.app.app_context(), chat_store.connect() as db:
            db.execute("UPDATE conversations SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 hours') WHERE id=?", (old,))
        listed = self.client.get('/api/conversations').get_json()['conversations']
        self.assertEqual([row['id'] for row in listed], [fresh])
        self.assertEqual(self.client.get('/api/conversations/' + old).status_code, 404)
        with nova.app.app_context(), chat_store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM messages WHERE conversation_id=?', (old,)).fetchone()[0], 0)

    def test_recent_message_resets_six_hour_expiry(self):
        cid = self.send('python quiz')['conversation_id']
        with nova.app.app_context(), chat_store.connect() as db:
            db.execute("UPDATE conversations SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 hours') WHERE id=?", (cid,))
        self.send('B', cid)
        with nova.app.app_context(), chat_store.connect() as db:
            age = db.execute("SELECT (julianday('now')-julianday(updated_at))*24 FROM conversations WHERE id=?", (cid,)).fetchone()[0]
        self.assertLess(age, 0.01)


if __name__ == '__main__':
    unittest.main()
