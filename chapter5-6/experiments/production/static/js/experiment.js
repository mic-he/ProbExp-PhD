var psiTurk = require('./psiturk');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');

class Experiment { //the main object of the whole thing
   
  constructor() {
    this.count = 0; //a counter to keep track of how many trials were dispalyed
    this.trialData = []; //initializes a vector to collect data
    this.allTrials = setupTrials(); //calls the function defined in items.js, which creates 12 trials
  }

  next() { //called when the subject clicks "next"
    if (this.count < this.allTrials.length) { //allTrials has length 12
      
      this.trial = this.allTrials[this.count]; //picks the this.count-th object constructed by setupTrial
      this.trialnumber = this.count+1; //just to number the trials starting from 1 instead of 0
          
        
      this.insertLines(this.trial); //function used to replace the wanted elements (picked by id, see below) with the text/html/... provided in items.js
        
      this.trialData.splice(0, 0, this.trialnumber, this.trial.condition, this.trial.value, this.trial.access, this.trial.observation);
      
	  this.start = + new Date();//starting time of the trial
	    
      this.count++;//self-explanatory

    }
    else
      new Questionnaire().start();
  }

  insertLines(t) {//where t is a variables for trials, in this case instantiated with this.trial
    
    $('#scenario').text(t.scenario);
    $('#question').html(t.question);      
    $('#item').html(t.item);
    $('#pic').html(t.pic);        
    $('#percentage').text(Math.floor(t.percentage)); //used to display the progress to the subject
    $('#percentageBis').text(Math.floor(t.percentageBis));
    
    //DEBUG  
//    $('#kind').text(t.kind);
//    $('#value').text(t.value);  
//    $('#access').text(t.access);
//    $('#observation').text(t.observation);
      
  }

       
 save(e) { //function called when the subject clicks on button "next"
    e.preventDefault();
	var RT = + new Date() - this.start;// record reaction time
    var answer = $(e.target).val(); //what matters is the value associated with the button "next" (the association is made by function "report", defined in item.html)     
     
    if(answer=="") //check: the subject must always choose an answer
       {
     alert("Please answer the question!");       
    }
     else {
        this.trialData = this.trialData.concat(answer, RT);//append answer and RT to the other data of this trial (kind,access etc.)     
        psiTurk.recordTrialData(this.trialData);
		    
        this.trialData = [];//empty the data, for the next trial
        document.getElementById('next').value="" //reset the button value to empty, for the next trial 
        this.next();
     } 


  }

  start() {
    psiTurk.showPage('item.html');
    $('#next').on('click', _.bind(this.save, this)); //when subject clicks "next", the function "save" is called with argument "this" (the button itself)
    this.next(); //defined above
  }
}

module.exports = Experiment;
