import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

// I think data_dir should eventually be implemented as an env variable.
// for the time being, declaring it here lets us pass it to the vector pipeline, keeping everything in the same place.

const __dirname = import.meta.dirname;
const dbdir = path.join(__dirname, "db")

class ChatLogger {
  
  constructor() {
    const chatdb = path.join(dbdir, "chat_messages.db")
    this.db = new DatabaseSync(chatdb)
  }

  async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT current_timestamp,
        last_seen TEXT NOT NULL DEFAULT current_timestamp,
        message_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        message_id INTEGER PRIMARY KEY NOT NULL,
        session_id VARCHAR NOT NULL,
        role TEXT CHECK(role in ('user','bot')) NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT current_timestamp
      );`
    );

    this.add_user = this.db.prepare(`
      INSERT INTO sessions ( session_id )
      VALUES ( ? )
      `
    );

    this.get_user = this.db.prepare(`
      SELECT * FROM sessions WHERE session_id = ?
      `
    );

    this.add_message = this.db.prepare(`
      INSERT INTO messages ( session_id, role, content )
      VALUES ( ?, ?, ? )
      `
    );

    this.get_message = this.db.prepare(`
      SELECT * FROM messages WHERE session_id = ?
      `
    );
  }

  async addUser(uuid) {
    this.add_user.run(`${uuid}`)
  }

  async getUser(uuid) {
    const user = this.get_user.all(uuid)
    return user[0]
  }

  async addMessage(uuid, role, content) {
    // console.log(uuid)
    // console.log(typeof(role))
    // console.log(content)
    this.add_message.run(uuid, role, content)
  }

  async getMessages(uuid) {
    return this.get_message.all(uuid)
  }

  
}

class Chatbot {

  constructor() { 
    this.vpipe = new VectorPipeline(dbdir)
    this.cpipe = new ChatbotPipeline();
    this.status = false;
    const system_prompt = `You are a research assistant in a psychological survey.
    Your job is to answer participant questions for a sample collection procedure.`
    this.chatlog = [{'role': 'system', 'content': system_prompt}];
    }

  async initChatbot() {
    await this.cpipe.loadModel();
    await this.vpipe.loadModel()
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async getChatbotResponse(text) {
    const context = await this.vpipe.getTextMatches(text);
    const context_str = context.toString()
    const prompt = `Answer the following USER QUERY: ${text}
      Do not use any prelearned knowledge in your answer. Refer only to the study instructions and this ADDITIONAL CONTEXT:
      ${context_str}
      If there is not additional context above, reply that you do not know the answer.`;
    console.log(prompt)
    // add user role, push to chatlog
    this.chatlog.push({'role':'user','content':prompt})
    const output = await this.cpipe.askChatbot(this.chatlog);
    this.chatlog = output
    const response = output[(output.length - 1)].content;
    return response;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
    this.vpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };