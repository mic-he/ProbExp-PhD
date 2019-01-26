function setupTrials() {
    
    var conditions = _.shuffle(["none","none","none","low","low","low","high","high","high"]); //a shuffled list of conditions, three for each level of high-order uncertainty
    var howmany = conditions.length
    var valuesNone = _.shuffle([102,103,105,107,108]); //a shuffled list of no uncertainty values, they are used to code <ACCES,OBSERVATION> pairs.
	var valuesLow = _.shuffle([80,82,84,86,88]); //a shuffled list of low uncertainty values
    var valuesHigh = _.shuffle([20,22,41,42,43]); //a shuffled list of high uncertainty values
    
    var meta = { //a structured object with the materials needed for the exp   
            
            'pic': "<table class='tg1'>"+
                      '<tr>'+
                        '<th class="th1"><img src="/static/images/first.png"></th>'+
                        '<th class="th1"><img src="/static/images/{VALUE}.png"></th>'+
                        '<th class="th1"><img src="/static/images/{VALUEback}.png"</img></th>'+
                        '<th class="th1"><img src="/static/images/last.png"></th>'+
                      '</tr>'+
                    '</table>',
            
            'scenario' : 'You draw {A} balls and observe that {O} of them {COPULA} red.',
    
            'question' : "<p>Which message do you send?</p>",
            
            'item' : "<p>The next ball will <select id='expression' name='expression' onchange='report(this.value)'>"+
                            "<option value='' ></option>"+
                            "<option value='certainlyNot'>certainly not</option>"+
                            "<option value='probablyNot'>probably not</option>"+
                            "<option value='possibly'>possibly</option>"+
                            "<option value='probably'>probably</option>"+
                            "<option value='certainly'>certainly</option>"+
                     "</select> be red.</p>"    
                };
  
    

    var res = _.map(_.range(0, 9), (w) => { //this function generates 9 trials, ie 9 objects with several properties

    var trial = {};
    
    trial.condition = conditions.shift();//selects a previously unselected condition (it actually removes the value from the vector)  
    if (trial.condition == "none"){ //the condition determines among which values we dra the value to display in this trial
        trial.value = valuesNone.shift();//selects a previously unselected no unc value
    } else if (trial.condition == "low"){
        trial.value = valuesLow.shift();//selects a previously unselected low unc value
    } else {
        trial.value = valuesHigh.shift();//selects a previously unselected no unc value
    }
    trial.valueBack = trial.value+"back"    
        
    if (trial.value == 1010) { //ad hoc treatment of 1010 value, to split it into 10 and 10
        trial.access = 10;
        trial.observation = 10;
    } else { // general treatment of other values
        trial.access = Math.floor(trial.value/10);//the integer part of trial.value divided by 10 
        trial.observation = Math.round(10*((trial.value/10)%1)); //it's the decimal part of trial.value divided by 10, times 10        
    };
    
        
    //what follows builds the descriptions/items/stuff that will be displayed on the screen, replacing what's needed depending on access/observation/kind
    
    trial.pic = meta.pic.replace('{VALUE}', trial.value).replace('{VALUEback}', trial.valueBack);
        
    if (trial.access == trial.observation) {
        
        if (trial.access == 10) {
            trial.scenario = meta.scenario.replace('{A}', "all the")
        }   else {
            trial.scenario = meta.scenario.replace('{A}', trial.access)
        };
        
        trial.scenario = trial.scenario.replace('{O}', "all")
        
    }   else { //ie if access!=observation
        
        if (trial.access == 10) {
            trial.scenario = meta.scenario.replace('{A}', "all the")
        }   else {
            trial.scenario = meta.scenario.replace('{A}', trial.access)
        };
        
        if (trial.observation === 0) {
            trial.scenario = trial.scenario.replace('{O}', "none")
        }   else {
            trial.scenario = trial.scenario.replace('{O}', trial.observation)
        }
        
    } 
    
        
    if (trial.observation == 1) {
        trial.scenario=trial.scenario.replace('{COPULA}', "is")
    }   else {
        trial.scenario=trial.scenario.replace('{COPULA}', "are")
    }
        
    
    trial.question = meta.question;        
    trial.item = meta.item;
    
    trial.v=w; //used to count the trials
    trial.percentage = (100*trial.v)/howmany
        
    return trial;
    });

    console.log(res);//I don't know why I have this

    return res;
    
}


module.exports = setupTrials;
