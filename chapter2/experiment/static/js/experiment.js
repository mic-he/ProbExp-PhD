var psiTurk = require('./psiturk');
var setupTrainings = require('./specific/items_t');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');

class Experiment { //the main object of the whole thing
   
  constructor() {
    this.count = 0; //a counter to keep track of how many trials were dispalyed
    this.trialData = []; //initializes a vector to collect data
    this.allTrainings = setupTrainings(); //calls the function defined in items_t.js, which creates the training trials
    this.switch=true; //simple and inelegant way to display a 'congratulations!' message after the training  
    this.allTrials = setupTrials(); //calls the function defined in items.js, which creates the trials
  }

  next() { //called when the subject clicks "next"
    if (this.count < this.allTrainings.length) {      
          this.trial = this.allTrainings[this.count]; //picks the this.count-th object constructed by setupTrainings
          this.trialnumber = this.count+1; //just to number the trials starting from 1 instead of 0
          this.insertLines(this.trial); //function used to replace the wanted elements (picked by id, see below) with the text/html/... provided in items.js
          this.trialData.splice(0, 0, this.trialnumber, this.trial.kind, this.trial.option, this.trial.shortExpression, this.trial.color, this.trial.scenario, this.trial.qud, this.trial.value);      
          this.start = + new Date();//starting time of the trial	    
          this.count++;//self-explanatory
    } 
    else if (this.count-this.allTrainings.length < this.allTrials.length) {
        if (this.switch) {
          this.switch=false; // it activates only once, to display the following slide, a "fake" trial slide to transition from training to trials    
          psiTurk.showPage('congratulations.html');
          $('#nextCongrats').on('click', _.bind(this.save, this)); //when subject clicks "next", the function "save" is called with argument "this" (the button itself)        
        }
        else {
          psiTurk.showPage('item.html');
          $('#nextMessage').on('click', _.bind(this.save, this)); //when subject clicks "next", the function "save" is called with argument "this" (the button itself)
          this.trial = this.allTrials[this.count-this.allTrainings.length]; //picks the this.count-th object constructed by setupTrial
          this.trialnumber = this.count+1;          
          this.insertLines(this.trial); //function used to replace the wanted elements (picked by id, see below) with the text/html/... provided in items.js
          this.trialData.splice(0, 0, this.trialnumber, this.trial.kind, this.trial.option, this.trial.shortExpression, this.trial.color, this.trial.scenario, this.trial.qud, this.trial.value);
          this.start = + new Date();//starting time of the trial
          this.count++;//self-explanatory
        }
    } 
    else 
        new Questionnaire().start();
  }

  insertLines(t) {//where t is a variables for trials, in this case instantiated with this.trial
    
    $('#senderpic').html(t.senderpic);  
    $('#qudPic').html(t.qudPic);
    $('#urnPic').html(t.urnPic);    
    $('#answerPic').html(t.answerPic);
    $('#description').html(t.description);
    $('#message').html(t.message);
    $('#question').html(t.question);
    $('#polarbutton').html(t.polarbutton);
    $('#betbutton').html(t.betbutton);
    $('#percentage').text(Math.floor(t.percentage)); //used to display the progress to the subject
 
  }

       
 save(e) { //function called when the subject clicks on button "next"
    e.preventDefault();
	var RT = + new Date() - this.start;// record reaction time
    var input_qud = document.getElementById('nextQud').value;
    var input_bet = document.getElementById('nextBet').value;
    if (document.getElementById('nextCongrats')!==null) {
        var input_congrats=document.getElementById('nextCongrats').value
        } else {
        var input_congrats='';    
        }
    var input_message = document.getElementById('nextMessage').value;   
     
    if (input_congrats=='placeholder'){ //the value associated with the Let'go! button in congratulations slide,no data to record
         this.trialData = [];//empty the data, for the next trial
         this.next();         
     }
     else {
        this.trialData = this.trialData.concat(input_qud,input_bet,input_message, RT);//append answer and RT to the other data of this trial (kind,access etc.)     
        psiTurk.recordTrialData(this.trialData);
		    
        this.trialData = [];//empty the data, for the next trial
         document.getElementById('nextQud').value="dots" //reset the button value to empty, for the next trial
         document.getElementById('nextBet').value="dots" //reset the button value to empty, for the next trial
         document.getElementById('nextMessage').value="dots" //reset the button value to empty, for the next trial
        this.next();
     }
  }
    


  start() {
    psiTurk.showPage('item_t.html');
    $('#nextBet').on('click', _.bind(this.save, this)); //when subject clicks "next", the function "save" is called with argument "this" (the button itself)
    this.next(); //defined above
  }
}

module.exports = Experiment;
