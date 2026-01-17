import { DatabaseSync } from 'node:sqlite'
import path from 'node:path';
import { ChatbotPipeline, VectorPipeline } from './chatpipelines.js';

// I think data_dir should eventually be implemented as an env variable.
// for the time being, declaring it here lets us pass it to the vector pipeline, keeping everything in the same place.
const __dirname = import.meta.dirname;
const data_dir = path.join(__dirname, 'db')
console.log(data_dir)

// I actually think it might make sense to create one vector pipeline for all sessions.
const vpipe = new VectorPipeline(data_dir)
await vpipe.loadModel()

class ChatLogger {

  // Creating class to simplify logging in main code. Also testing node:sqlite library 
  // It's experimental, but would allow a pure node frontend/backend, setup & launch with one npm script
  //   -> https://nodejs.org/api/single-executable-applications.html
  //   -> https://nodejs.org/api/sqlite.html
  // Note we're implementing logging outside the chatbot class - we only want to create one database object.

  constructor() {
    this.path = path.join(data_dir,'chat_messages.db')
    this.db = new DatabaseSync(this.path);

    // SQL code below grabbed directly from Saoirse's schema.sql, testing required for SQLite compatibility.
    // I think AUTO_INCREMENT might not exist for example?

    // SESSIONS TABLE: session_id | created_at | last_seen
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR PRIMARY KEY,
        created_at TEXT,
        last_seen TEXT
      );
    `);

    // MESSAGES TABLE: id | session_id | role | content | created_at
    // need to think about created_at metadata - maybe a per-user sequence number would be better?
    // -> timing could be used to deanonymise logs
    this.db.exec(`
      CREATE TABLE [IF NOT EXISTS] messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        role ENUM('user','bot') NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(session_id),
        CONSTRAINT fk_messages_session
          FOREIGN KEY (session_id) REFERENCES sessions(session_id)
          ON DELETE CASCADE
      );
    `);

  };

  static createUser(uuid) {
    // create user - associate with session id and human-readable 'username'
  };

  static getUser(uuid) {
    this.db.exec(`
      SELECT...etc
      WHERE session_id = ${uuid}
      `)
  };

  static logMessage(uuid, role, content) {
    // log messages to messages table. possibly input in array (of arrays) - this will allow ['user':'message'] inputs for multiple message pairs.
    this.dbfile.exec(

    )
  };

}

class Chatbot {

  constructor() {
    // this.vpipe = new VectorPipeline()
    this.cpipe = new ChatbotPipeline()
    this.status = false
  }

  async initChatbot() {
    await this.cpipe.loadModel()
    this.status = true
  }

  static getChatbotStatus() {
    return this.status
  }

  async getChatbotResponse(text) {
    const context = await vpipe.getTextMatches(text)
    const query = `text+${context}`
    const response = await this.cpipe.askChatbot(query)
    return response
  }

  async killChatbot() {
    this.cpipe.unloadModel()
  }
}

export { ChatLogger, Chatbot }