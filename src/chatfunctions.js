import { pipeline } from "@huggingface/transformers";
import fs from 'fs';
import { LocalIndex } from 'vectra';
import path from 'node:path';

// const index = new LocalIndex(path.join(process.cwd(), 'index'))
// if (!(await index.isIndexCreated())) {
//   await index.createIndex();
// }

// async function addToIndex(text) {
//   const text_vector = await getVector(text)
//   await index.insertItem({
//         vector: text_vector,
//         metadata: { text },
//     });
// }

// async function queryIndex(text) {
//     const vector = await getVector(text);
//     const results = await index.queryItems(vector, 3);
//     if (results.length > 0) {
//         for (const result of results) {
//             console.log(`[${result.score}] ${result.item.metadata.text}`);
//         }
//     } else {
//         console.log('No results found.');
//     }
// }

// async function addItemsToIndex(input_arr) {
//   const vector_arr = await extractor(
//         input_arr,
//         { pooling: 'mean' },
//     );
//   for (var i = 0; i < input_arr.length; i++) {
//     const text = input_arr.at(i)
//     await index.insertItem({
//       vector: vector_arr[i],
//       metadata: { text },
//     })
//   }
// }

// async function TryThis() {
//   const items = ['apple','oranges','red','blue'];
//   await addItemsToIndex(items)
//   const output = await queryIndex('green')
//   console.log(output)
// }

// await TryThis()


// function readFile(filename) {
//   let file = fs.readFileSync(filename)
//   const instruct_arr = file.toString().split("\r\n")
//   const instruct_clean = []

//   for (var i = 0; i < instruct_arr.length; i++) {
//     const instruction = instruct_arr.at(i)
//     if (instruction != "") {
//       instruct_clean.push(instruction)
//     }
//   }

//   return instruct_clean
// }

// console.log(readFile('study_docs/SDJC01-PIL01 Stool Sample.docx.txt'))


// console.log(rag_output)

class GenericPipeline {

  constructor(task, model) {
    this.task = task
    this.model = model
    this.status = false
  }

  async loadModel() {
    this.pipe = await pipeline(
      this.task,
      this.model,
      { dtype: "auto" },
    );
    this.status = true
    return this.status
  };

  static isModelReady() {
    if (this.status == false) {
      return false
    }
    return true
  };
}

class VectorPipeline extends GenericPipeline {

  constructor() {
    const task = 'feature-extraction';
    const model = 'Xenova/jina-embeddings-v2-small-en';
    super(task, model)
  }

  async getEmbeddings(text) {
    const output = await pipe(
        text,
        { pooling: 'mean' },
    );
    return output;
  }

}


class ChatbotPipeline extends GenericPipeline {
  
  constructor(model, system_prompt) {

    const task = 'text-generation';
    super(task, model)

    this.chatlog = [
    {"role": "system", "content": system_prompt}
    ];
  };

  async askChatbot(query) {
    // if (this.isModelReady() == false) {
    //   return "Model is not ready."
    // } else {
    const contextquery = query
    const newquery = {"role": "user", "content": contextquery};
    this.chatlog.push(newquery);
    const pipe_output = await this.pipe(this.chatlog, {
      max_new_tokens: 100,
      return_full_text: true
      }
    )
    const reply = pipe_output[0].generated_text.at(-1);
    this.chatlog.push(reply);
    return reply.content
    // }
  };
}

// TEST FUNCTION CALLS - CHATBOTPIPELINE
const model = 'HuggingFaceTB/SmolLM2-1.7B-Instruct'
const system_prompt = "You are a research assistant in a psychological survey. \
      Your specific task is to provide instructions and answers to participants regarding a stool sampling procedure. \
      If you do not know the answer, communicate this to the user."
const pipe = new ChatbotPipeline(model, system_prompt);
await pipe.loadModel()
const prompt = "What can you do?"
const response = await pipe.askChatbot(prompt)
console.log(response)

// here we have prompt, response as const vars - could easily log in main code.