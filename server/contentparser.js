// TODO: 13/1
// 1. search & pull top (3?) pages from sources
// 2. parse pages for content - likely per source depending on layout etc.
// 3. run embedding model.

async function getMedlineData(keyword) {
  const url = 'https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term='+keyword;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.text();
    console.log(result);
  } catch (error) {
    console.error(error.message);
  }

  // parse for <document rank=0 (1,2,..?) > and retrieve url=example.com
  // 
}

async function getNHSData(keyword) {
  // handling for NHS API - this will need an API key - env variable? Will eventually be handled in admin API.

}

async function getLabTestsData(keyword) {
  // handling for labtestsonline. Plan here is to scrape file.
  const index_url = 'https://labtestsonline.org.uk/tests-index'
  const search_url = 'https://labtestsonline.org.uk/search?keywords='+keyword

}

function readFile(filename) {
  let file = fs.readFileSync(filename)
  const instruct_arr = file.toString().split('\r\n')
  const instruct_clean = []

  for (var i = 0; i < instruct_arr.length; i++) {
    const instruction = instruct_arr.at(i)
    if (instruction != '') {
      instruct_clean.push(instruction)
    }
  }

  return instruct_clean
}

console.log(readFile('study_docs/SDJC01-PIL01 Stool Sample.docx.txt'))