const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');

const PATH_DATA = './downloaded_data';

// configure mongo connection
mongoose.pluralize(null);

mongoose.connect('mongodb://root:password@localhost:27017/genome?authSource=admin');

const DatasetCollection = mongoose.model('dataset', new mongoose.Schema({}, { strict: false }));
  
// STEP-001: get all dataset samples files
fs.readdir(PATH_DATA, function (err, files) {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  } 
  
  getFiles(files).then(() => {
    mongoose.connection.close(); 

    console.log('Import finalized');    
  });    
})

const getFiles = async (files) => {
  for (const file of files) {
    const result = await parser(file);

    console.log(result);    
  };
};

const parser = (file) => {
  return new Promise((resolve, reject) => {
    // STEP-002: read samples file and parse to json
    var fileName = file.split('.')[0];    
    var cancerCode = fileName.split('_')[0];
    var fileType = fileName.split('_')[1];
      
    let dataType;
    if (fileType !== undefined) {
      if (fileType.includes('RNA')) {      
        dataType = 'rna';
      }
      else {
        dataType = 'gene';
      }
    }
      
    let results = [];  
    let dataset = [];
    
    var s = fs.createReadStream(PATH_DATA + '/' + file, 'utf8')
      .pipe(csv({ separator: '\t' }))
      .on('error', (err) => {
        console.log('Error while reading file.', err);
      })    
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", () => {
        if (results.length > 0) {
          // STEP-003: initialize patient samples dataset from first sample
          const keys = Object.keys(results[0]);

          for (let i = 1; i < keys.length; i++) {
            sample = {};
            sample['sampleName'] = keys[i];
            sample['sampleType'] = dataType;
            sample['cancerCode'] = cancerCode;
            sample['measures'] = [];

            dataset.push(sample);
          }
        
          // STEP-004: add sample details (expresion genes and miRNAs) for each patient sample dataset
          for (let i = 0; i < results.length; i++) {          
            for (let j = 0; j < dataset.length; j++) {
              if (!results[i]['sample'].includes('?')) {
                if (results[i][dataset[j]['sampleName']] !== 'NA')
                  dataset[j]['measures'].push({ 'key': results[i]['sample'], 'value': parseFloat(results[i][dataset[j]['sampleName']]) });                
                else
                  dataset[j]['measures'].push({ 'key': results[i]['sample'], 'value': results[i][dataset[j]['sampleName']] });                
              }
            }
          }

          // STEP-005: save dataset in database  
          DatasetCollection.insertMany(dataset)
            .then((err, res) => {
              resolve("Dataset for file " + file + " inserted");              
            }).catch((error) => {
              reject("Dataset for file " + file + " with error: " + error);              
            });                        
        }                                         
      });  
    });
}