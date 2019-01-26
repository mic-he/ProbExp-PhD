var psiTurk = require('../psiturk');


class Questionnaire {

  save_data(language) {
	var comments = $('#comment').val();
    psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});
    psiTurk.recordTrialData([language]);
	psiTurk.recordTrialData([comments]);
    psiTurk.recordUnstructuredData('language', language);
    psiTurk.recordUnstructuredData('comments', comments);
    
	$('select').each(function(i, val) {
      psiTurk.recordTrialData([this.value]);
    });
  }

  record_responses() {
    // save their native language
    var language = $('#language').val();
    this.LANGUAGE = false;
    
    $('select').each(function(i, val) {
      psiTurk.recordUnstructuredData(this.id, this.value);
    });

    if (language === '') {
      alert('Please indicate your native language.');
      $('#language').focus();
      return false;
    } else {
        this.LANGUAGE = true;
        this.save_data(language);
    }
  }

  prompt_resubmit() {
    var error = ["<h1>Oops!</h1><p>Something went wrong submitting your HIT.",
                 "This might happen if you lose your internet connection.",
                 "Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>"].join(' ');
    $('body').html(error);
    $('#resubmit').on('click', _.bind(this.resubmit, this));
  }

  resubmit() {
    $('body').html('<h1>Trying to resubmit...</h1>');
    var reprompt = setTimeout(_.bind(this.prompt_resubmit, this), 10000);
    if (!this.LANGUAGE) this.save_data('NA');

    var self = this;
    psiTurk.saveData({
      success: () => {
        clearInterval(reprompt); 
        psiTurk.completeHIT();
      },
      error: _.bind(this.prompt_resubmit, this)
    });
  }

  start() {
    // Load the questionnaire snippet 
    psiTurk.showPage('postquestionnaire.html');
    psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});

    $('#next').on('click', () => {
      this.record_responses();
      psiTurk.saveData({
        success: psiTurk.completeHIT,
        error: _.bind(this.prompt_resubmit, this)
      });
    });
  }
}

module.exports = Questionnaire;
