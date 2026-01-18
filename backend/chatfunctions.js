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
        message_id INTEGER PRIMARY KEY,
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
      INSERT INTO messages ( message_id, session_id, role, content )
      VALUES ( ?, ?, ?, ? )
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
    const user = this.get_user.all(`${uuid}`)
    return user
  }

  async addMessage(uuid, role, content) {
    this.add_message.run(`${uuid}, ${role}, ${content}`)
  }

  async getMessages(uuid) {
    return this.get_message.all(`${uuid}`)
  }

  
}

class Chatbot {

  constructor() { 
    this.vpipe = new VectorPipeline(dbdir)
    this.cpipe = new ChatbotPipeline();
    this.status = false;
    this.chatlogs = {}
    const system_prompt = `You are a research assistant in a psychological survey. You inform participants about a stool sampling procedure.
              Answer all subsequent prompts which follow "User Query:" in your own words, using only the provided information under "Additional Information:".
              If the additional information does not contain a logical answer to the query, respond that you do not know the answer.`
    this.prompt_init = [{'role': 'system', 'content': system_prompt}];
    }

  async initChatbot() {
    await this.cpipe.loadModel();
    await this.vpipe.loadModel()
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async newChatSession(uuid) {
    addUser.run(`'${uuid}'`)
    this.chatlogs[session_id] = this.prompt_init;
  }

  async getChatbotResponse(uuid, text) {
    addMessage.run(uuid, "user", text)
    const context = this.vpipe.getTextMatches(text);
    const prompt = `${text}+${context}`;

    // add user role, push to chatlog
    this.chatlogs[uuid].push({'role':'user','content':prompt})
    const output = this.cpipe.askChatbot(this.chatlogs[uuid]);
    this.chatlogs[uuid] = output
    return this.chatlogs[uuid].at(-1).content;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
    this.vpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };

    
