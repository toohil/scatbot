import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

// I think data_dir should eventually be implemented as an env variable.
// for the time being, declaring it here lets us pass it to the vector pipeline, keeping everything in the same place.
const __dirname = import.meta.dirname;
const data_dir = path.join(__dirname, 'db');

class ChatLogger {

  // Creating class to simplify logging in main code. Also testing node:sqlite library 
  // It's experimental, but would allow a pure node frontend/backend, setup & launch with one npm script
  //   -> https://nodejs.org/api/single-executable-applications.html
  //   -> https://nodejs.org/api/sqlite.html
  // Note we're implementing logging outside the chatbot class - we only want to create one database object.

  constructor() {
    this.path = path.join(data_dir,'chat_messages.db');
    this.db = new DatabaseSync(this.path);

    // SQL code below modified from Saoirse's schema.sql for SQLite compatibility.
    // SESSIONS TABLE: session_id | created_at | last_seen
    // MESSAGES TABLE: id | session_id | role | content | created_at
    // need to think about created_at metadata - maybe a per-user sequence number would be better?
    // -> timing could be used to deanonymise logs
    console.log("Success");
  };

  async initDatabase() {
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
      );
    `);
    this.addUser = this.db.prepare(`
      INSERT INTO sessions ( session_id )
      VALUES ( ? )`)
    this.queryUser = this.db.prepare(`SELECT * FROM sessions WHERE session_id = ?`)
    this.addMessage = this.db.prepare(`
      INSERT INTO messages ( message_id, session_id, role, content )
      VALUES ( ?, ?, ?, ? )
      `)
  }

  async createUser(uuid) {
    // create user - associate with session id and human-readable 'username'
    this.addUser.run(`'${uuid}'`)
  }

  async getUser(uuid) {
    const output = this.queryUser.all(`'${uuid}'`)
    return output;
  };

  static logMessage(uuid, role, content) {
    // log messages to messages table. possibly input in array (of arrays) - this will allow ['user':'message'] inputs for multiple message pairs.
    this.db.exec()
  };

};

class Chatbot {

  constructor() {
   this.vpipe = new VectorPipeline(data_dir)
   this.cpipe = new ChatbotPipeline();
   this.status = false;
   this.chatlogs = {}
   this.system_prompt = `You are a research assistant in a psychological survey. You inform participants about a stool sampling procedure.
            Answer all subsequent prompts which follow "User Query:" in your own words, using only the provided information under "Additional Information:".
            If the additional information does not contain a logical answer to the query, respond that you do not know the answer.`
   this.prompt_init = [{'role': 'system', 'content': system_prompt}];
   this.db = new ChatLogger()
  }

  async initChatbot() {
    await cpipe.loadModel();
    this.status = true;
  }

  static getChatbotStatus() {
    return this.status;
  }

  async newChatSession(session_id) {
    this.db.createUser(session_id)
    this.chatlogs[session_id] = this.prompt_init;
  }

  async getChatSession(session_id) {
    return this.db.getUser(session_id)
  }

  async getChatbotResponse(session_id, text) {
    db.logMessage(session_id, "user", text)
    const context = this.vpipe.getTextMatches(text);
    const prompt = `${text}+${context}`;

    // add user role, push to chatlog
    this.chatlogs[session_id].push({'role':'user','content':prompt})
    const output = this.cpipe.askChatbot(this.chatlogs[session_id]);
    this.chatlogs[session_id] = output
    return this.chatlogs[session_id].at(-1).content;
  }

  async killChatbot() {
    this.cpipe.unloadModel();
    this.vpipe.unloadModel();
  }
}
export { Chatbot };

    
