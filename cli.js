#!/usr/bin/env node

var _ = require('underscore')
var fs = require('fs')
var inquirer = require("inquirer");
var program = require('commander')
var fs = require('fs')
var replace = require('replace')
var exec = require('child_process').exec;

var generator = {
  repository: '',
  path: '',
  statement: '',
  variables: []
}

program
  .version('0.0.0')
  .arguments('<repository> [destination]')
  .option('-v, --verbose')
  .option('-k, --keep-git-repo', 'If used the .git folder will not be cleaned from the generated folder')
  .action(function (repository, destination) {
    repositoryValue = repository;
    destinationValue = destination;
  });

program.parse(process.argv);

// Check for required repository value
if (typeof repositoryValue === 'undefined') {
   console.error('no repository given');
   process.exit(1);
}
else {
  generator.repository = repositoryValue
}

// Determine path
if (typeof destinationValue === 'undefined') {
  generator.path = process.cwd()
}
else if (destinationValue.substr(0, 1) === '/') {
  generator.path = destinationValue 
} 
else if (destinationValue.substr(0, 1) === '.') {
  generator.path = process.cwd() + destinationValue.substr(1, destinationValue.length) 
}
else { 
  generator.path = process.cwd() + '/' + destinationValue
}

var fetchGen = function(callback) { 
  exec('git clone ' + generator.repository + ' ' + generator.path, function(err, stderr, stdout) {
    if (err) return callback(err)
    callback(null) 
  })
}

var parseGen = function(callback) {
  fs.readFile(generator.path + '/README.md', 'utf8', function (err,data) {
    if (err) return callback(err)
    var lines = data.split('\n')
    var read = false
    lines.forEach(function(line) {
      if (read == true && line.substr(0,2) == '##') read = false
      if (read == true)  generator.statement += line + '\n' 
      if (read == false && line == '## Statement')  read = true
    }) 
    generator.variables = (generator.statement).match(/{{(.*?)}}/g)
    callback(null)
  });
}

var generateQuestions = function(variables) {
  var questions = []
  variables.forEach(function(variable) {
    questions.push({
      type: "input",
      name: variable,
      message: variable + '?',
      validate: function( value ) {
        var pass = value.match(/^([01]{1})?[\-\.\s]?\(?(\d{3})\)?[\-\.\s]?(\d{3})[\-\.\s]?(\d{4})\s?((?:#|ext\.?\s?|x\.?\s?){1}(?:\d+)?)?$/i);
        if (value) {
          return true;
        } 
        else {
          return "Please enter a value";
        }
      }
    })
  })
  return questions
}

var recursiveFindAndReplace = function(variables, path, callback) {
  _.each(variables, function(value, key) {
    replace({
      regex: key,
      replacement: value,
      paths: [path],
      recursive: true,
      silent: true
    })
  })
}


// GO!
fetchGen(function(err) {
  if (err) return console.log(err)
  parseGen(function(err, gen) {
    if (err) return console.log(err)
    console.log(generator.statement)
    var questions = generateQuestions(generator.variables)
    inquirer.prompt(questions, function(answers) {
      recursiveFindAndReplace(answers, generator.path, function(err) {
        if (err) return console.log(err)
        console.log('Done.')
      })
    })
  })
})

