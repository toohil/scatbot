import { ChatbotPipeline, VectorPipeline } from './chatfunctions.js';
import fs from 'fs';

// Piecing it all together.
const text = fs.readFileSync('study_docs/SDJC01-PIL01 Stool Sample.docx.txt','utf-8')
const instructions = text.split('\r\n')

const vector_pipe = new VectorPipeline()
await vector_pipe.loadModel()
for (const i in instructions) {
  const instruction = instructions[i].replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
  const instruction_clean = instruction.trim()
  if (instruction != "") {
    await vector_pipe.addToIndex(instruction_clean)
  }
}

const chat_model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
const system_prompt = "You are a research assistant in a psychological survey. You provide instructions and answers to participants in a stool sampling procedure. \
      Answer the prompt which follows the text \"User Query:\". Use only the information that follows the text \"Additional Information:\" when constructing your answer. \
      If the additional information does not contain a logical answer, you must respond that you do not know the answer."

const chat_pipe = new ChatbotPipeline(chat_model, system_prompt)
await chat_pipe.loadModel()
const query = "What should I do with the AnaeroGen sachet?"

const additional_info = await vector_pipe.getTextMatches(query)
const chat_query = `User Query: ${query} \n Additional Information: ${additional_info}`
const response = await chat_pipe.askChatbot(chat_query)
console.log(response)