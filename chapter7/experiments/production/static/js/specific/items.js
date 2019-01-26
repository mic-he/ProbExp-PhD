function setupTrials() {
    
    var values = _.shuffle([20,22,41,42,43,80,82,84,86,88,102,103,105,107,108]); //a shuffled list of values, they are used to code <ACCES,OBSERVATION> pairs.
	
	var howmany = 12 //how many trials?

    var meta = { //a structured object with the materials needed for the exp   
                
            'pic': "<table class='tg1'>"+
                      '<tr>'+
                        '<th class="th1"><img src="/static/images/first.png"></th>'+
                        '<th class="th1"><img src="/static/images/{VALUE}.png"></th>'+
                        '<th class="th1"><img src="/static/images/{VALUEback}.png"</img></th>'+
                        '<th class="th1"><img src="/static/images/last.png"></th>'+
                      '</tr>'+
                    '</table>',
            
            'scenario' : 'You draw {A} balls and observe that {O} of them {COPULA} red.'

    };
  
    

    var res = _.map(_.range(0, 12), (w) => { //this function generates 12 trials, ie 12 objects with several properties

    var trial = {};
    
    trial.value = values.shift();//selects a previously unselected value (it actually removes the value from the vector)
    trial.valueBack = trial.value+"back"

    if (trial.value == 1010) { //ad hoc treatment of 1010 value, to split it into 10 and 10
        trial.access = 10;
        trial.observation = 10;
    } else { // general treatment of other values
        trial.access = Math.floor(trial.value/10);//the integer part of trial.value divided by 10 
        trial.observation = Math.round(10*((trial.value/10)%1)); //it's the decimal part of trial.value/10, times 10        
    };
    
            
    //what follows builds the descriptions/items/stuff that will be displayed on the screen, replacing what's needed depending on access/observation/kind
    
    trial.pic = meta['pic'].replace('{VALUE}', trial.value).replace('{VALUEback}', trial.valueBack);
        
    if (trial.access == trial.observation) {
        
        if (trial.access == 10) {
            trial.scenario = meta['scenario'].replace('{A}', "all the")
        }   else {
            trial.scenario = meta['scenario'].replace('{A}', trial.access)
        };
        
        trial.scenario = trial.scenario.replace('{O}', "all")
        
    }   else { //ie if access!=observation
        
        if (trial.access == 10) {
            trial.scenario = meta['scenario'].replace('{A}', "all the")
        }   else {
            trial.scenario = meta['scenario'].replace('{A}', trial.access)
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
        
    
    trial.v=w; //used to count the trials
    trial.percentage = (100*trial.v)/howmany
    trial.percentageBis = (100*trial.v)/howmany
        
    return trial;
    });

    console.log(res);//I don't know why I have this

    return res;
    
}


module.exports = setupTrials;
