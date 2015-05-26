#!/usr/bin/env node

var log = console.log

var _ = require('underscore')
var fs = require('fs')
var inquirer = require("inquirer");
var program = require('commander')
var fs = require('fs')
var replace = require('replace')
var exec = require('child_process').exec;

var generator = {
  repository: '',
  destinationTmp: '',
  destination: '',
  statement: '',
  variables: {}
}

program
  .version('0.0.3')
  .option('--repository <repository>')
  .option('--destination <destination>')
  .option('--variables <variables>', 'A JSON object to feed into the templates. You must provide all variables.')
  .option('--keep-git-repo', 'If used the .git folder will not be cleaned from the generated folder')
  .parse(process.argv);

// Check for required repository value
if (typeof program.repository === 'undefined') {
  console.error('no repository given');
  process.exit(1);
}
else {
  generator.repository = program.repository
}

// Determine destination
if (typeof program.destination === 'undefined') {
  generator.destination = process.cwd()
}
else if (destinationValue.substr(0, 1) === '/') {
  generator.destination = program.destination 
} 
else if (program.destination.substr(0, 1) === '.') {
  generator.destination = process.cwd() + destinationValue.substr(1, program.destination.length) 
}
else { 
  generator.destination = process.cwd() + '/' + program.destination
}
generator.destinationTmp = generator.destination + '/.yeobot-tmp'

if (program.variables) {
  generator.variables = JSON.parse(program.variables)
}

var fetchGen = function(callback) { 
  exec('git clone ' + generator.repository + ' ' + generator.destinationTmp, function(err, stderr, stdout) {
    if (err) return callback(err)
    callback(null) 
  })
}

var cleanGen = function(callback) { 
  if (program.keepGitRepo !== true) {
    exec('rm -rf ' + generator.destinationTmp + '/.git', function(err, stderr, stdout) {
      if (err) return callback(err)
      callback(null) 
    })
  }
  else {
    callback(null) 
  }
}

var parseGen = function(callback) {
  fs.readFile(generator.destinationTmp + '/README.md', 'utf8', function (err,data) {
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

var recursiveFindAndReplace = function(variables, destination, callback) {
  _.each(variables, function(value, key) {
    replace({
      regex: key,
      replacement: value,
      paths: [destination],
      recursive: true,
      silent: true
    })
  })
  callback()
}


// GO!
exec('mkdir ' + generator.destinationTmp, function(err, stderr, stdout) {
  // If we have variables then we are ready to find and replace else we need to ask
  if ((_.keys(generator.variables)).length > 0) {
    fetchGen(function(err) {
      if (err) return console.log(err)
      cleanGen(function(err) {
        if (err) return console.log(err)
        recursiveFindAndReplace(generator.variables, generator.destinationTmp, function(err) {
          if (err) return console.log(err)
          exec('mv ' + generator.destinationTmp + '/* ' + generator.destination, function(err, stderr, stdout) {
            exec('rm -rf ' + generator.destinationTmp, function(err, stderr, stdout) {
              console.log('Done.')
            })
          })
        })
      })
    })
  }
  else {
    fetchGen(function(err) {
      if (err) return console.log(err)
      cleanGen(function(err) {
        if (err) return console.log(err)
        parseGen(function(err) {
          if (err) return console.log(err)
          console.log('')
          console.log(generator.statement)
          console.log('')
          var questions = generateQuestions(generator.variables)
          inquirer.prompt(questions, function(answers) {
            recursiveFindAndReplace(answers, generator.destinationTmp, function(err) {
              if (err) return console.log(err)
              exec('mv ' + generator.destinationTmp + '/* ' + generator.destination, function(err, stderr, stdout) {
                exec('rm -rf ' + generator.destinationTmp, function(err, stderr, stdout) {
                  console.log('Done.')
                })
              })
            })
          })
        })
      })
    })
  }
})
