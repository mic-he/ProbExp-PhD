# complex uncertainty expressions

This records the PPCs inside of JAGS (thus avoiding a potential additional error source). It separates the computations into several files:

- first execute `00_preamble.R` to load helper functions and data
- `03_run_JAGS.R` runs the main JAGS model in `jags_model.R` and stores the results as `j.samples.Rdata`
- `04_postprocessing.R` generates the plots for data, the PPCs, summary statistics ...
- `05_data_plots.R` plots the data and gets some summary statistics of it as well ... 

The model used here has independent thresholds for all expressions and uses the literal listeners priors over values instead of a flat (mean) average over Hellinger distances.

The model in `jags_model_test.R` in conjunction with `06_run_JAGS_test.R` is for debugging/testing. It does not condition on the data but just returns the predictions for a set of fixed parameter values.
