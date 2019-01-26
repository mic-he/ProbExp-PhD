model {
  ##SLIDERS
  for (i in 1:nSubjs) { # participants
    for (j in 1:13) { # conditions, ie 'values' representing partial observations of the urn
      for (k in 1:nBins){ # 11 bins, one for each state (0,1,..,10 red balls in the urn)
        y[i,j,k] <- k.skew[i] * log(subj[i,j,k] / (1 - subj[i,j,k]))
        y.slider[i,j,k] ~ dnorm(y[i,j,k], tau) # conditioning on data, as processed in process_data_bda.R
        y.sliderPPC[i,j,k] ~ dnorm(y[i,j,k], tau) # generate fake data
      }
    }
  }

  ## noise parameters
  # wPrime ~ dgamma(0.5, 1)
  # w = 1/wPrime
  sigma ~ dgamma(0.5, 1)
  tau <- 1/sigma^2

  ## priors for logistic skew
  # for (i in 1:n.subj) { k.skew[i] ~ dgamma(2, 1) }
  k ~ dgamma(5,5)
  # k =.5
  for (i in 1:nSubjs) { k.skew[i] <- k }
  
  ## rational beliefs: several possible parametrizations of betabin / prior structures
  # alphaPrime ~ dgamma(0.5, 1)
  # alpha = alphaPrime + 1
  # alpha=1

  # alpha~dunif(0,1000)# shape par of the betabinomial distribution describing prior over states
  # beta~dunif(0,1000) # we can assume symmetric betabinomial setting beta=alpha
  
  # beta = alpha
  
  kappa_minustwo~dgamma(0.01,0.01) # the distribution over states  is parametrized in terms of mode and concentration, it works better this way
  omega~dunif(0,1)
  kappa=kappa_minustwo+2
  alpha=omega*(kappa-2)+1 # shape of prior distribution
  beta=(1-omega)*(kappa-2)+1
  
  # prior on state space as betabinomial distribution
  for (s in 1:nBins){
    state.prior[s]=dbetabin(states[s], alpha, beta, 10)
  }
  
  ## hypergeometric model
  # probability of observing O[v] red balls having drawn A[v] balls when there are s-1 red balls in the urn
  for (v in 1:nItems){
    for (s in 1:nBins){
      hypergeometric[v,s]=dhyper(O[v], states[s], 10-states[s], A[v],1)
    }
  }

  # speaker's belief as bayes-inverted hypergeometric distrib
  for (v in 1:nItems){
    for (s in 1:nBins){
      TMPrational.bel[v,s]=(hypergeometric[v,s]*state.prior[s])+epsilon
    }
  }

  # normalize by state to obtain population-level ideal distributions for each condition
  for (v in 1:nItems){
    for (s in 1:nBins){
      rational.bel[v,s]=(TMPrational.bel[v,s]/sum(TMPrational.bel[v,]))
    }
  }
  
  ## subject specific distribution
  for (i in 1:nSubjs) {
    for (v in 1:13) { # each subject saw 13 conditions
      # subj[i, v, 1:11] ~ ddirch((rational.bel[subj_condition_indices[i,v],1:11]* w))
      subj[i, v, 1:11] = rational.bel[subj_condition_indices[i,v],1:11]
    }
  }
  
}