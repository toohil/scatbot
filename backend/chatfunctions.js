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

  constructor() { 
    const steps = `- The night before sample gathering, place the freezer block in the freezer overnight to freeze. 
      - Place the frozen freezer block in one of the ziplock bags.
      - Put on the disposable gloves.
      - Place the plastic container onto the toilet bowl and perform bowel movement into this (the whole bowel motion, not just part of it). Please avoid getting any urine in the plastic container and do not wrap or cover the sample in toilet paper.
      - Tear off the top of the AnaeroGen sachet which is taped to the lid of the container (see image below). Do not remove the inner sachet.
      - Within one minute of tearing the top of the sachet, secure the lid of the container firmly, and place the plastic container in second zip lock bag (i.e. the empty bag).
      - Remove and dispose of gloves.
      - Seal the zip lock bag, place the ziplock bag with the stool sample into the ziplock bag containing the frozen freezer block, and seal.
      - Place the ziplock bag (containing the freezer block, and containing the ziplock bag with the stool sample) in the paper envelope and seal.
      - Write down the date and the time of the stool sample on the envelope. 
      - Place the sample in the fridge until you leave for the research lab session`

    const system_prompt = `You are Scatbot, a helpful assistant for psychological surveys. You provide information on the following procedure:
      ${steps}
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

  async getChatbotResponse(step, text) {
    const context = await vpipe.getTextMatches(text);
    const context_str = context.toString();
    const prompt = `PARTICIPANT QUERY:
      I am currently following this instruction: ${step}
      Please help me with the following: ${text}
      ADDITIONAL CONTEXT:
      ${context_str}`
    const output = await this.cpipe.askChatbot(prompt);
    return output;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
  }
}

export { Chatbot, ChatLogger };