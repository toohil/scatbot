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

// creating just one vector pipeline instance - use for all chatbots.
const vpipe = new VectorPipeline()
await vpipe.loadModel()

class Chatbot {

  constructor(steps) { 
    this.steps = steps

    const system_prompt = `You are Scatbot, a helpful assistant for psychological surveys. You provide information on the following procedure:
      ${this.steps}
      You will be given a PARTICIPANT QUERY, the CURRENT STEP they are following, and ADDITIONAL CONTEXT.
      Address the participant directly in your responses, using the provided context. Keep responses concise, just one sentence.
      If the participant's question is not in any of the context provided, reply that you do not know.`

    this.cpipe = new ChatbotPipeline(system_prompt);
    this.status = false;
  }

  async initChatbot() {
    await this.cpipe.loadModel();
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async getChatbotResponse(query_type, text) {
    let prompt = ""
    if (query_type === "step") {
      // handle next step
      prompt = ""
    } else if (query_type === "info") {
      // handle more info
      prompt = ""
    } else {
      // keep existing behaviour - freetext question.
      let context = await vpipe.getTextMatches(text);
      context = context.toString();
      prompt = `PARTICIPANT QUERY:
        I am currently following this instruction: ${step}
        Please help me with the following: ${text}
        ADDITIONAL CONTEXT:
        ${context}`
    }
    const output = await this.cpipe.askChatbot(prompt);
    return output;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };