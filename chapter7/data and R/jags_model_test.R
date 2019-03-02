## RSA speaker+listener JAGS model, called by r2jags function in the main file

# var: declare vectors matrices and arrays here with correct number and length of dimension
var likely[11], possible[11], unlikely[11], TMPmatrix[11,3],state.semantics[3,11], value.semantics[9,65], 
literal.state.bel[11,3], hypergeometric[65,11], TMPrational.bel[65,11], rational.bel[65,11],TMParray[3,65,11], 
EU.simple[3,65], TMPmatrix2[65,9], literal.value.bel[65,9], TMParray1[65,65,11], distances[65,65],avg.distance1[9,65], 
TMParray3[9,65,65],EU.complex1[9,65],TMPmatrix1[65,12], speaker.prob[65,12], TMParray2[12,65,11], listener.prob[12,65,11], 
TMPmatrix4[12,65], listener.prob.value[12,65], TMPmatrix5[12,11],listener.prob.state[12,11], countdata.value[12,65], 
countdata.state[12,11], fakedata.state[12,11], PPC.value[12,65], PPC.state[12,11], PPC.expression[65,12]; 

# model
model{  
  lambda = 5 
  
  alpha = 1
  beta = 1
  
  alpha_ax = 1 
  beta_ax = 1
  
  theta.might=0.1
  theta.probably=0.6
  theta.certainly=0.9
  theta.possible=0.1
  theta.likely=0.6
  
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
  
  # hypergeometric model as matrix values by state
  # probability of observing O[v] red balls having drawn A[v] balls when there are s-1 red balls in the urn
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(obs[v],states[s],n-states[s],acc[v],1)
    }
  }
  
  # rational belief as bayes-inverted hypergeometric
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      TMPrational.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  # normalize by state
  for (v in 1:length(values)){
    for (s in 1:length(states)){
      rational.bel[v,s]=TMPrational.bel[v,s]/sum(TMPrational.bel[v,])
    }
  }
  
  # state semantics for simple messages
  # literal semantics relative to states: matrix message by state as a function of theta(s), usual threshold meaning
  # truth-conditions
  for (s in 1:length(states)) { #three basic messages
    possible[s] = ifelse(states[s]>theta.possible*n, 1, 0)
    likely[s] = ifelse(states[s]>theta.likely*n, 1, 0)
    unlikely[s] = ifelse(n-(n*theta.likely) > states[s], 1, 0)
  }
  # as a matrix, all messages
  for (m in 1:length(simple)) {
    for (s in 1:length(states)) {
      state.semantics[m,s]=ifelse(m==1,likely[s],ifelse(m==2,possible[s],unlikely[s])) 
    }
  }
  
  # listener's belief about states, having received a message m
  for (s in 1:length(states)) {
    for (m in 1:length(simple)) {
      TMPmatrix[s,m]=state.semantics[m,s]*state.prior[s] 
      #TMPmatrix[s,m]=state.semantics[m,s]
    }
  }
  for (s in 1:length(states)) {
    for (m in 1:length(simple)) {# first three messages, simply normalize
      literal.state.bel[s,m]=TMPmatrix[s,m]/sum(TMPmatrix[,m]) 
    }
  }
  
  # EU of simple messages is negative distance between speaker distribution over outcomes given value and listener's distribution over outcome give message
  for (m in 1:length(simple)){
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        TMParray[m,v,s]=(sqrt(rational.bel[v,s])-sqrt(literal.state.bel[s,m]))^2
      }
    }
  }
  for (m in 1:length(simple)){
    for (v in 1:length(values)){
      EU.simple[m,v]=-(1/sqrt(2))*(sqrt(sum(TMParray[m,v,])))
    }
  }
  
  # literal semantics for complex messages relative to values as function of state.semantics and rational.bel, 
  # complex messages use the "sum" rule
  for (v in 1:length(values)){
    for (m in 1:3){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m,])>theta.certainly, 1, 0) # certainly
    }
    for (m in 4:6){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-3,])>theta.probably, 1, 0) # probably
    }
    for (m in 7:9){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-6,])>theta.might, 1, 0) # might
    }      
  }
  
  # literal listener's belief over values: uniformly choose among the values compatible with received complex message
  for (v in 1:length(values)) {
    for (m in 1:length(complex)) {
      TMPmatrix2[v,m]=value.prior[v]*value.semantics[m,v] 
    }
  }
  for (v in 1:length(values)) {
    for (m in 1:length(complex)){# normalize
      literal.value.bel[v,m]=TMPmatrix2[v,m]/sum(TMPmatrix2[,m])
    }
  }
  
  # EU of complex messages minimizes avg distance between speaker's distribution given value and distrbutions induced in the listener by message
  # first compute a matrix value by value, containing the distances between each pair of distributions over states induces by values
  for (v in 1:length(values)){
    for (u in 1:length(values)){
      for (s in 1:length(states)){
        TMParray1[v,u,s]=(sqrt(rational.bel[v,s])-sqrt(rational.bel[u,s]))^2
      }
    }
  }
  for (v in 1:length(values)){
    for (u in 1:length(values)){
      distances[v,u]=(1/sqrt(2))*(sqrt(sum(TMParray1[v,u,])))
    }
  }
  
  # literal listener prior and posterior beliefs about values
  for (v in 1:length(values)){
    ll.value.priorTMP[v]= value.prior[v] * sum(TMPrational.bel[v,])
  }
  for (v in 1:length(values)){
    ll.value.prior[v]= ll.value.priorTMP[v] / sum(ll.value.priorTMP)
  }
  for (v in 1:length(values)){
    for (m in 1:length(complex)){
      ll.value.posteriorTMP[m,v] = ll.value.prior[v] * value.semantics[m,v] 
    }
  }
  for (v in 1:length(values)){
    for (m in 1:length(complex)){
      ll.value.posterior[m,v] = ll.value.posteriorTMP[m,v] / sum(ll.value.posteriorTMP[m,])
    }
  }
  # for each observed v and sent m we compute ll.value.posterior-weighted distance 
  # between speaker's bel and the listener's distributions that
  # are induced by values compatible with received message m
  for (m in 1:length(complex)){
    for (v in 1:length(values)){
      for (u in 1:length(values)){
        TMParray3[m,v,u]=distances[v,u]*ll.value.posterior[m,u]
      }
      avg.distance1[m,v]=sum(TMParray3[m,v,])
      EU.complex1[m,v]=-avg.distance1[m,v]
    }
  }
  
  # speaker probability of sending m given v, conditional on the kind of m
  for (v in 1:length(values)){
    for (m in 1:3){#first three messages are simple
      TMPmatrix1[v,m]=exp(lambda*EU.simple[m,v])
    }
    for (m in 4:length(messages)){# the complex ones
      TMPmatrix1[v,m]=exp(lambda*EU.complex1[m-3,v])
    }
  }
  # normalize
  for (v in 1:length(values)){
    for (m in 1:length(messages)){
      speaker.prob[v,m]=TMPmatrix1[v,m]/sum(TMPmatrix1[v,])
    }
  }
  
  # # conditioning on production data as counts of expressions for each experimental condition (values)
  # for (v in 1:length(prod.values)){
  #   countdata.expression[v,] ~ dmulti(speaker.prob[prod.values.indices[v],],production.trials[v])
  #   PPC.expression[v,] ~ dmulti(speaker.prob[prod.values.indices[v],],production.trials[v])
  # }
  
  # listerner probability: bayes-inverted speaker prob together with prior on states, values and rational model of the urn
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        TMParray2[m,v,s]=speaker.prob[v,m]*value.prior[v]*hypergeometric[v,s]*state.prior[s]
      }
    }
  }
  for (m in 1:length(messages)){ # normalize
    for (v in 1:length(values)){
      for (s in 1:length(states)){
        listener.prob[m,v,s]=TMParray2[m,v,s]/sum(TMParray2[m,,])
      }
    }
  }
  
  # listener probability over values, ie marginalized: summed across states
  for (m in 1:length(messages)){
    for (v in 1:length(values)){
      TMPmatrix4[m,v]=sum(listener.prob[m,v,])
    }
  }
  for (m in 1:length(messages)){ # normalize
    for (v in 1:length(values)){
      listener.prob.value[m,v]=TMPmatrix4[m,v]/sum(TMPmatrix4[m,])
    }
  }
  
  # listener probability over states, ie marginalized: summed across values
  for (m in 1:length(messages)){
    for (s in 1:length(states)){
      TMPmatrix5[m,s]=sum(listener.prob[m,,s])
    }
  }
  for (m in 1:length(messages)){ # normalize
    for (s in 1:length(states)){
      listener.prob.state[m,s]=TMPmatrix5[m,s]/sum(TMPmatrix5[m,])
    }
  }
  
  # # conditioning on interpretation data. notice: the values observed in the exp are exactly the same full set of all possible values
  # # so there's no need to filter the indeces here
  # for (m in 1:length(messages)){
  #   countdata.value[m,] ~ dmulti(listener.prob.value[m,],interpretation.trials[m])
  #   countdata.state[m,] ~ dmulti(listener.prob.state[m,],interpretation.trials[m])
  #   PPC.value[m,] ~ dmulti(listener.prob.value[m,],interpretation.trials[m])
  #   PPC.state[m,] ~ dmulti(listener.prob.state[m,],interpretation.trials[m])
  # }
  
}
