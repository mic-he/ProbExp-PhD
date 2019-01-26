/// Slider related goodies ///
function sliderLabel(i) {
  return 'slider' + i.toString();
}

var responses = [];
var nResponses = 0;


function resetRadio() {
  $('#radios').children().children().prop('checked', false);
}


function resetSlider() {
  // gets called on after each item
  _.each($('.slider'), function(slider) {
    $(slider).slider('option', 'value', 0.5);
    $(slider).css({ 'background': '', 'border-color': '' });
  });

  responses = [];
  nResponses = 0;
}


function changeCreator(i) {
  return function(value) {
        $('#' + sliderLabel(i)).css({"background":"#99D6EB"});
        $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
          "background":"#667D94",
          "border-color": "#001F29"
        });

        if (responses[i] === undefined) {
          responses[i] = 1;
          nResponses += 1;
        }
  };
}


function slideCreator(i) {
  return function() {
    $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
           "background":"#E0F5FF",
           "border-color": "#001F29"
    });
  };
}


function insertBins(nbins, toclone) {
  var i = 0;
  //var toclone = $('#bin-toclone');

  while (nbins--) {
    var clone = toclone.clone();
    clone.attr('id', 'bin' + nbins);
    clone.insertAfter($('#bin-after'));
  }
}


function insertSliders(nbins, toclone) {
  // clone the slider that is in the item.html file
  // *nbins* times and then remove the slider that is in item.html
  var i = 0;
  //var toclone = $('.toclone');

  while (nbins--) {
    var clone = toclone.clone();
    
    clone.children().attr('id', 'slider' + nbins);
    clone.insertAfter($('#slider-after'));
  }
}


function insertRadio() {
  // clone the bins, change the html of the respective elements
  // to radio input elements; insert it before the bins
  var i = -1;
  var input = '<input type="radio" name="answer" />';
  var el = $('#bins').clone();
  $(el).attr('id', 'radios');
  
  $(el).children().html(input).attr('id', function() {
    return 'radio' + i++;
  });

  $(el).insertBefore($('#bins'));
  $('#radios > td[width="150"]').children().attr('type', 'hidden');
}


function createSliders(nbins) {
  var i;
  var attr = {
      "width":"12px",
      "height":"360px",
      "position":"relative",
      "margin":"5px"
  };

  for (i = 0; i < nbins; i++) {
    var label = sliderLabel(i);
    $('#' + label).attr(attr);
    $('#' + label + ' .ui-slider-handle').attr({"background": "#FAFAFA"});
    $('#' + label).slider({
      animate: true,
      orientation: "vertical",
      max: 1 , min: 0, step: 0.01, value: 0.5,
      slide: slideCreator(i),
      change: changeCreator(i)
    });
  }
}

/// end of slider related goodies///



var psiTurk = require('./psiturk');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');

var Experiment = function() { //the main object of the whole thing
    
  var count = 0;
  var nbins = 11;
  var bins = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
  var MAXBINS = 11;
    
  var bin_clone = $('<td class="toclone" id="bin-toclone" align="center" width="100"></td>');
  var slider_clone = $('<td class="toclone" rowspan="5" width="100" align="center"> <div class="slider ui-slider ui-slider-vertical ui-widget ui-widget-content ui-corner-all" id="slider-clone" width="12px" height="360px" position="relative" margin="5px" aria-disabled="false"> <a class="ui-slider-handle ui-state-default ui-corner-all" href="#" style="bottom: 50%;"></a> </div> </td>');

  var trialData = [];
  var start = + new Date();    
    
  var allTrials = setupTrials();//calls the function defined in items.js, which creates a number of trials
    
  var next = function() {

    // if there are items left, start a new trial
    if (count < allTrials.length) {

      var trial = allTrials[count++];
      trialData.splice(0, 0, parseInt(count), trial.value, trial.access, trial.observation);
      
      resetSlider();

      // insert all the sliders into the page
      insertBins(nbins, bin_clone);
      insertSliders(nbins, slider_clone);
      createSliders(nbins);

      $('#pic').html(trial.pic);
      $('#scenario').text(trial.scenario);
      $('#percentage').text(Math.floor(trial.percentage)); //used to display the progress to the subject
      $('#percentageBis').text(Math.floor(trial.percentageBis)); //same

      _.each(bins, function(bin, i) {
        $('#bin' + i).html(bin);
      });
    }

    else {
      // end the experiment & show post-questionnaire
      new Questionnaire().start();
    }
  };    

       
  var save = function(e) {
    e.preventDefault();
    if (nResponses < nbins) {
      var mess = ['Please rate every quantity.', 'If you think that a slider is placed correctly,',
                  'just click on it.', 'You can only proceed if all sliders have been checked or moved.'].join(' ');
      alert(mess);
      return false;
    }

    var RT = + new Date() - start;

    // get the ratings
    var ratings = _.map($('.slider'), function(slider) {
      return $(slider).slider('option', 'value');
    });

    while (_.size(ratings) < MAXBINS) {
      ratings.push('NA');
    }

    // add the ratings to the trial data & save to server
    trialData.splice(0, 0, RT);
    trialData = trialData.concat(ratings);
    console.log(trialData);
    console.log(_.size(trialData));
    psiTurk.recordTrialData(trialData);


    trialData = []; // reset for next trial
    $('.toclone').remove(); // remove all sliders and bins
    next();
  };
    
  psiTurk.showPage('item.html');
  $('#answered').on('click', save);

/*  // secret shortcut. press '9' and all sliders are marked!
  $('body').on('keypress', function(e) {
    if (e.which == 57 || e.code == 57) {
      nResponses = nbins;
      $('.slider').css({'background': '#99D6EB'});
    }
  });*/

  next(); // start experiment    
}

module.exports = Experiment;
