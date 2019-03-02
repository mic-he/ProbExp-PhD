## RSA speaker+listener JAGS model, called by r2jags function in the main file

# var, declare vectors matrices and arrays here with correct dimensions and sizes, otherwise jags gets confused
var certainlyNot[11], probablyNot[11], possibly[11], probably[11], certainly[11], semantics[5,11], TMPmatrix[11,5], literal.bel[11,5], hypergeometric[65,11], speaker.bel[65,11], TMPspeaker.bel[65,11], TMParray[5,65,11], EU[5,65], TMPmatrix2[65,5], speaker.prob[65,5], TMParray2[5,65,11], listener.prob[5,65,11], TMPmatrix4[5,65],TMPmatrix5[5,11], listener.prob.value[5,65], listener.prob.state[5,11], countdata.value[5,59], countdata.state[5,11]; 

# model
model{
  # parameters, these will be inferred given the data
  # alpha~dunif(0,alpha.max) # shape par of the betabinomial distribution describing prior over states
  # beta~dunif(0,alpha.max) # we assume symmetric betabinomial
  
  kappa_minustwo~dgamma(0.01,0.01) # the distribution over access values is parametrized in terms of mode and concentration, it works better this way
  omega~dunif(0,1)
  kappa=kappa_minustwo+2
  alpha=omega*(kappa-2)+1 # shape of prior distribution over access
  beta=(1-omega)*(kappa-2)+1 # in this case we don't assume symmetry
  
  lambda~dunif(0,lambda.max) # rationality par
  
  kappa_ax_minustwo~dgamma(0.01,0.01) # the distribution over access values is parametrized in terms of mode and concentration, it works better this way
  omega_ax~dunif(0,1)
  kappa_ax=kappa_ax_minustwo+2
  alpha_ax=omega_ax*(kappa_ax-2)+1 # shape of prior distribution over access
  beta_ax=(1-omega_ax)*(kappa_ax-2)+1 # in this case we don't assume symmetry
  
  theta.possibly~dunif(theta.min, theta.max) # these are the semantic thresholds
  theta.probably~dunif(theta.min, theta.max)
  theta.certainly~dunif(theta.min, theta.max)
  
  # priors on parameters
  # alpha.prior~dunif(0,alpha.max) 
  # beta.prior~dunif(0,alpha.max) 
  lambda.prior~dunif(0,lambda.max)
  theta.prior~dunif(theta.min, theta.max)
  kappa.prior~dgamma(0.01,0.01)
  omega.prior~dunif(0,1)
  kappa_ax.prior~dgamma(0.01,0.01)
  omega_ax.prior~dunif(0,1)
  
  # prior on states, betabinomial distribution
  for (s in 1: length(states)){
    state.prior[s]=dbetabin(states[s], alpha, beta, n)
  }
  
  # prior on access, betabinomial distrib
  for (v in 1: length(values)){
    access.prior[v]=dbetabin(acc[v], alpha_ax, beta_ax, n)
  }
  # normalizing this we obtain distribution over values
  for (v in 1:length(values)){
    value.prior[v]=access.prior[v]/sum(access.prior)
  }
  
  # literal semantics of messages as functions of theta (and obvious ones)
  for (s in 1:length(states)){
    certainly[s] = ifelse(states[s]>theta.certainly*n,1,0)
    certainlyNot[s] = ifelse(s-1<(1-theta.certainly)*n,1,0)
    possibly[s] = ifelse(states[s]>theta.possibly*n, 1,0)
    probably[s] = ifelse(states[s]>theta.probably*n, 1,0)
    probablyNot[s] = ifelse(s-1<(1-theta.probably)*n,1,0)
  }
  
  # semantics as a matrix message by state
  for (m in 1:length(messages)) {
    for (s in 1:length(states)) {
      semantics[m,s]=ifelse(m==1,certainly[s],ifelse(m==2,certainlyNot[s],ifelse(m==3,possibly[s],ifelse(m==4,probably[s],probablyNot[s]))))
    }
  }
  
  # literal listener's beliefs as a matrix state by message
  for (s in 1:length(states)) {
    for (m in 1:length(messages)) {
      TMPmatrix[s,m]=state.prior[s]*semantics[m,s]
    }
  }
  # and normalize it
  for (s in 1:length(states)) {
    for (m in 1:length(messages)) {
      literal.bel[s,m]=TMPmatrix[s,m]/sum(TMPmatrix[,m]) 
    }
  }
  
  ## hypergeometric model as matrix values by state
  # first, probability of observing obs(v) red balls having drawn acc(v) balls when there are s-1 red balls in the urn
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(obs[v], states[s], n-states[s], acc[v], 1)
    }
  }
  
  # second, speaker's belief as bayes-inverted hypergeometric
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      TMPspeaker.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  # normalize by state
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      speaker.bel[v,s]=TMPspeaker.bel[v,s]/sum(TMPspeaker.bel[v,])
    }
  }
  
  
  ## EU of a message given a value is negative HD between belSpeaker and belDummy
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        TMParray[m,v,s]=(sqrt(speaker.bel[v,s])-sqrt(literal.bel[s,m]))^2
      }
    }
  }
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      EU[m,v]= -(1/sqrt(2))*(sqrt(sum(TMParray[m,v,])))
    }
  }
  
  ## Speaker probability: soft max of EU, with two (possibly) different lambdas for high and low uncertainty
  for (v in 1:length(values)){
    for (m in 1:length(messages)){
      # TMPmatrix2[v,m]=ifelse(acc[v]<=5,exp(lambdahigh*EU[m,v]),exp(lambdalow*EU[m,v]))
      TMPmatrix2[v,m]=exp(lambda*EU[m,v])
    }
  }
  # and normalize
  for (v in 1:length(values)){
    for (m in 1:length(messages)){
      speaker.prob[v,m]=TMPmatrix2[v,m]/sum(TMPmatrix2[v,])
    }
  }
  
  # conditioning on production data as counts of expressions for each experimental condition (values)
  for (v in 1:length(prod.values)){
    countdata.expression[v,] ~ dmulti(speaker.prob[prod.values.indices[v],],production.trials[v])
  }
  
  ## Listerner probability: bayes-inverted speaker prob together with prior on states, values and rational model of the urn
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        TMParray2[m,v,s]=speaker.prob[v,m]*value.prior[v]*hypergeometric[v,s]*state.prior[s]
      }
    }
  }
  for (m in 1:length(messages)){ #normalize: the matrix for each message must sum to 1
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        listener.prob[m,v,s]=TMParray2[m,v,s]/sum(TMParray2[m,,])
      }
    }
  }
  
  ## Listener probability over values, ie marginalized: summed across states
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      TMPmatrix4[m,v]=sum(listener.prob[m,v,])
    }
  }
  for (m in 1:length(messages)){ #normalize
    for (v in 1:length(values)){
      listener.prob.value[m,v]=TMPmatrix4[m,v]/sum(TMPmatrix4[m,])
    }
  }
  
  ## Listener probability over states, ie marginalized: summed across values
  for (m in 1:length(messages)){
    for (s in 1:length(states)){
      TMPmatrix5[m,s]=sum(listener.prob[m,,s])
    }
  }
  for (m in 1:length(messages)){ #normalize
    for (s in 1:length(states)){
      listener.prob.state[m,s]=TMPmatrix5[m,s]/sum(TMPmatrix5[m,])
    }
  }
  
  # conditioning on interpretation data
  for (m in 1:length(messages)){
    countdata.value[m,] ~ dmulti(listener.prob.value[m,inter.values.indices],interpretation.trials[m])
    countdata.state[m,] ~ dmulti(listener.prob.state[m,],interpretation.trials[m])
  }
}