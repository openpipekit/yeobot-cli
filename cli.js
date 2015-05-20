#!/usr/bin/env node

var _ = require('underscore')
var fs = require('fs')
var inquirer = require("inquirer");
var program = require('commander')
var fs = require('fs')
var replace = require('replace')
var exec = require('child_process').exec;

program
  .version('0.0.0')
  .option('-r, --repository <URI>', 'GIT URI pointing to the generator')
  .option('-v, --verbose')
  .option('-k, --keep-git-repo', 'If left out, the .git folder will be cleaned from the generated folder')
  .parse(process.argv);

var fetchGen = function(repository, callback) { 
  var path = process.cwd() + '/autorun'
  exec('git clone ' + repository + ' ' + path, function(err, stderr, stdout) {
    if (err) return callback(err)
    callback(null, path) 
  })
}

var parseGen = function(path, callback) {
  var generator = {
    statement: '',
    variables: []
  }
  fs.readFile(path + '/README.md', 'utf8', function (err,data) {
    if (err) return callback(err)
    var lines = data.split('\n')
    var read = false
    lines.forEach(function(line) {
      if (read == true && line.substr(0,2) == '##') read = false
      if (read == true)  generator.statement += line + '\n' 
      if (read == false && line == '## Statement')  read = true
    }) 
    generator.variables = (generator.statement).match(/{{(.*?)}}/g)
    callback(null, generator)
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
      recursive: true
    })
  })
}


// GO!
fetchGen(program.repository, function(err, path) {
  if (err) return console.log(err)
  parseGen(path, function(err, gen) {
    if (err) return console.log(err)
    console.log(gen.statement)
    var questions = generateQuestions(gen.variables)
    inquirer.prompt(questions, function(answers) {
      recursiveFindAndReplace(answers, path, function(err) {
        if (err) return console.log(err)
        console.log('Done.')
      })
    })
  })
})

