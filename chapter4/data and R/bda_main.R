library('coda')
library('ggmcmc')
library('jagsUI') # for parallel computing
library('VGAM')

source('helpers.R')
source('bda_process.R') # not necessary if it has been run once already, and output saved

# if bda_process was run, load output here
load("processed_data_bda.RData") # processed data in the vector y.slider is saved in this file

saveFlag = TRUE

# state space: natural number from 0 to 10, possible quantities of red balls in the urn
states=c(0:10)
# the function valuesF defined in helpers.r generates all logically possible combinations of access and observation given state space
V=valuesF()$values
A=valuesF()$accessValues
O=valuesF()$observationValues

# V contains every condition, but each subject saw only 13 at random, as collected in subj_condition matrix saved in processed_data_bda.RData
# we need the indices of each subject's condition in the full vector V
subj_condition_indices=matrix(nrow = length(ids), ncol = 13)
for (i in 1:length(ids)){
  for (u in 1:13){
    for (v in 1:65){
      if (V[v]==subj_condition[i,u]){subj_condition_indices[i,u]=v}
    }
  }
#subj_condition_indices[i,]=subj_condition_indices[i,][order(subj_condition_indices[i,])]
}


# data to pass to jags  
data_aggr <- list(y.slider=y.slider, subj_condition_indices=subj_condition_indices, 
                  nSubjs = length(ids), nItems = length(V), nBins = length(states),
                  states=states, A=A, O=O, epsilon=0.000001)

# variables to trace
params <- c(
            # 'w',
            'sigma',
            #'rational.bel',
            #'subj',
            'k',
            'alpha',
            'beta',
            # 'kappa',
            # 'omega',
            "y.sliderPPC"
            )

# model and jags parameters and stuff
model = "bda_jags.R"
burnin = 5000
iter = 2500
# jags command
out = jags(data = data_aggr,
            inits = NULL,
            parameters.to.save = params,
            codaOnly = c("y.sliderPPC"),
            model.file = model,
            n.chains = 2,
            n.adapt = 100,
            n.iter = iter + burnin,
            n.burnin = burnin,
            n.thin = 2, 
            modules=c('glm','mix','bugs'),
            DIC = FALSE,
            verbose = TRUE,
            parallel = TRUE
           )

print(out)

if (saveFlag) { save(V,A,O,out, file = "output.Rdat") }