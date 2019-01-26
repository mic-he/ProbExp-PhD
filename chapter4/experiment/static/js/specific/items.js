function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len;
    }
    return result;
}

function setupTrials() {
    
    var allvalues = [10,11,20,21,22,30,31,32,33,40,41,42,43,44,50,51,52,53,54,55,60,61,62,63,64,65,66,
                     70,71,72,73,74,75,76,77,80,81,82,83,84,85,86,87,88,90,91,92,93,94,95,96,97,98,99,100,
                     101,102,103,104,105,106,107,108,109,1010] //a list of values, they are used to code <ACCES,OBSERVATION> pairs.
    var values = getRandom(allvalues, 13); //every participant sees a certain number of urn configurations at random
	
	var howmany = values.length

    var pic = '<table class="tg1">'+
                      '<tr>'+
                        '<th class="th1"><img src="/static/images/{VALUE}.png" height="210" width="126"></th>'+
                      '</tr>'+
                    '</table>';
            
    var scenario = 'You draw {A} balls and observe that {O} of them {COPULA} red.';         
 

    var res = _.map(_.range(0, howmany), (w) => { //this function generates |howmany| trials, ie a number of objects with several properties

    var trial = {};
    
    trial.value = values.shift();//selects a previously unselected value (it actually removes the value from the vector)
    trial.valueBack = trial.value+"back"

    if (trial.value == 1010) { //ad hoc treatment of 1010 value, to split it into 10 and 10
        trial.access = 10;
        trial.observation = 10;
    } else { // general treatment of other values
        trial.access = Math.floor(trial.value/10);//the integer part of trial.value divided by 10 
        trial.observation = Math.round(10*((trial.value/10)%1)); //it's the decimal part of trial.value divided by 10, times 10        
    };
    
    
    //what follows builds the descriptions/items/stuff that will be displayed on the screen, replacing what's needed depending on access/observation/kind
    
    trial.pic = pic.replace('{VALUE}', trial.value).replace('{VALUEback}', trial.valueBack);
        
        if (trial.value==10)
           {
           trial.scenario = 'You draw one ball and observe that it is not red.'
           } 
            else if (trial.value==11)
                    {
                    trial.scenario = 'You draw one ball and observe that it is red.'
                    }
                else
                    {if (trial.access == trial.observation) {

                        if (trial.access == 10) {
                            trial.scenario = scenario.replace('{A}', "all the")
                        }   else {
                            trial.scenario = scenario.replace('{A}', trial.access)
                        };

                        trial.scenario = trial.scenario.replace('{O}', "all")

                    }   else { //ie if access!=observation

                        if (trial.access == 10) {
                            trial.scenario = scenario.replace('{A}', "all the")
                        }   else {
                            trial.scenario = scenario.replace('{A}', trial.access)
                        };

                        if (trial.observation === 0) {
                            trial.scenario = trial.scenario.replace('{O}', "none")
                        }   else {
                            trial.scenario = trial.scenario.replace('{O}', trial.observation)
                        }
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
