# simple uncertainty expressions
cleaning and exploration of data, visualization, modeling, bayesian data analysis

the clean_explore.r script contains preliminary exploration and visualization of the data, is used to bootstrap confidence intervals and to produce cleaner and compact datasets; the script also performs bayesian regression analysis of the data

the pragmatic model is implemented in two versions: prediction_functions.r contains a pure R implementation, jags_model.r contains the JAGS implementation (the implementations are equivalent, but slightly different due to how JAGS works)

data and model come together in the analysis_plots.r script, where we train the model on the data inferring plausible values for the free parameter and we generate model predictions given these values

we evalutate/criticize our model in terms of correlation scores and posterior predictive checks

plots for the chapter are produced in analysis_plots.R as well