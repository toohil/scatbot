import fs from 'node:fs';
import { VectorPipeline } from './chatpipelines.js';

function readFile(filename) {
  let file = fs.readFileSync(filename)
  const instruct_arr = file.toString().split('\n')
  const instruct_clean = []

  for (var i = 0; i < instruct_arr.length; i++) {
    const instruction = instruct_arr.at(i)
    if (instruction != '') {
      instruct_clean.push(instruction)
    }
  }

  return instruct_clean
}

const vpipe = new VectorPipeline()
await vpipe.loadModel()

const vectordb = {
  vectors: []
}

const instructions = readFile('./study_docs/rag-samples.txt')
for (const text of instructions) {
  const vector = await vpipe.createVector(text)
  vectordb.vectors.push({
    "vector": vector,
    "text": text
  })
}

var vectorjson = JSON.stringify(vectordb)
fs.writeFile("./db/vector_index.json", vectorjson, function(err){
    if(err) throw err;
})