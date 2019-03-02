### we source this file to obtain the two predictions functions; notice that many variables are undefined, and only specified in the analysis.r file

## production
predictions.sp = function(alpha,beta,lambda,theta.possibly,theta.probably,theta.certainly) {
  # betabinomial distribution as prior on states, alpha=1 makes it flat
  state.prior=c() 
  for (s in 1: length(states)){
    state.prior[s]=dbetabinom.ab(states[s],n, alpha, beta)
  }
  # init arrays etc 
  certainly=c()
  certainlyNot=c()
  possibly=c()
  probably=c()
  probablyNot=c()
  semantics=matrix(nrow=length(messages), ncol = length(states))
  literal.bel=matrix(nrow=length(states), ncol = length(messages))
  hypergeometric=matrix(nrow=length(V.prod),ncol=length(states))
  speaker.bel=matrix(nrow=length(V.prod),ncol=length(states))
  EU=matrix(nrow=length(messages),ncol=length(V.prod))
  speaker.prob=matrix(nrow=length(V.prod),ncol=length(messages))

  ## semantics, generates matrix message by state as a function of theta(s)
  # truth-conditions
  for (s in 1:length(states)) {
    certainly[s] = ifelse(states[s]>theta.certainly*n, 1, 0)
    certainlyNot[s] = ifelse(states[s]<(1-theta.certainly)*n, 1, 0)
    possibly[s] = ifelse(states[s]>theta.possibly*n, 1, 0)
    probably[s] = ifelse(states[s]>theta.probably*n, 1, 0)
    probablyNot[s] = ifelse(states[s]<(1-theta.probably)*n, 1, 0)
  }
  
  # as a matrix
  for (m in 1:length(messages)) {
    for (s in 1:length(states)) {
      semantics[m,s]=ifelse(m==1,certainly[s],ifelse(m==2,certainlyNot[s],ifelse(m==3,possibly[s],ifelse(m==4,probably[s],probablyNot[s]))))
    }
  }
  row.names(semantics)=messages 
  colnames(semantics)=states
  
  ## literal listener's beliefs, normalized
  for (s in 1:length(states)) {
    for (m in 1:length(messages)) {
      literal.bel[s,m]=semantics[m,s]*state.prior[s] 
    }
  }
  literal.bel=prop.table(literal.bel,2) 
  row.names(literal.bel)=states
  colnames(literal.bel)=messages 
  
  ## hypergeometric model as matrix V.prod by state
  # first, probability of observing o red balls having drawn a balls whenthere are n red balls in the urn
  for (v in 1:length(V.prod)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(O.prod[v],states[s],n-states[s],A.prod[v])
    }
  }
  row.names(hypergeometric)=V.prod  
  colnames(hypergeometric)=states
  
  # second, speaker's belief as bayes-inverted hypergeometric, normalized
  for (v in 1:length(V.prod)){
    for (s in 1:length(states)){
      speaker.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  speaker.bel=prop.table(speaker.bel,1)
  row.names(speaker.bel)=V.prod  
  colnames(speaker.bel)=states
  # as data frame
  df.beliefs=as.data.frame(melt(speaker.bel))
  colnames(df.beliefs)=c("value","state","probability")
  
  ## EU of a message given a value is negative HD between speaker.bel and literal.bel
  for (m in 1:length(messages)){
    for (v in 1:length(V.prod)){
      EU[m,v]= -HD(speaker.bel[v,], literal.bel[,m])
    }
  }
  row.names(EU)=messages 
  colnames(EU)=V.prod

  ## Speaker probability: probSpeaker(m|v)=exp(lambda*EU(m|v))
  speaker.prob=prop.table(exp(lambda*t(EU)),1)
  row.names(speaker.prob)=V.prod
  colnames(speaker.prob)=messages
  # as data frame
  df.speaker=as.data.frame(melt(speaker.prob))
  colnames(df.speaker)=c("value","answer","probability")
  
  # finally return predictions as dfs
  return(list(speaker=df.speaker))
}



## interpretation
predictions.li = function(alpha,alpha_ax,beta,beta_ax,lambda,theta.possibly,theta.probably,theta.certainly) {
  state.prior=c()
  for (s in 1: length(states)){
    state.prior[s]=dbetabinom.ab(states[s],n, alpha, beta)
  }
  # prior over V: assume betabinom distrib over access and flat over observations
  # each value v=<a,o> is associated with the probability that a betabinom distribution associates to the corresponding access a
  access.prior=c() # betabin prior on access values
  for (v in 1: length(V.inter)){
    access.prior[v]=dbetabinom.ab(A.inter[v],n, alpha_ax, beta_ax)
  }
  # normalizing this we obtain distribution over V.inter
  value.prior=prop.table(access.prior)

  # init arrays etc 
  certainly=c()
  certainlyNot=c()
  possibly=c()
  probably=c()
  probablyNot=c()
  semantics=matrix(nrow=length(messages), ncol = length(states))
  literal.bel=matrix(nrow=length(states), ncol = length(messages))
  hypergeometric=matrix(nrow=length(V.inter),ncol=length(states))
  speaker.bel=matrix(nrow=length(V.inter),ncol=length(states))
  EU=matrix(nrow=length(messages),ncol=length(V.inter))
  speaker.prob=matrix(nrow=length(V.inter),ncol=length(messages))
  listener.prob=array(dim=c(length(messages),length(V.inter),length(states)))
  listener.prob.state=matrix(nrow=length(messages),ncol=length(states))
  listener.prob.value=matrix(nrow=length(messages),ncol=length(V.inter))
  
  ## semantics, generates matrix message by state as a function of theta(s)
  # truth-conditions
  for (s in 1:length(states)) {
    certainly[s] = ifelse(states[s]>theta.certainly*n, 1, 0)
    certainlyNot[s] = ifelse(states[s]<(1-theta.certainly)*n, 1, 0)
    possibly[s] = ifelse(states[s]>theta.possibly*n, 1, 0)
    probably[s] = ifelse(states[s]>theta.probably*n, 1, 0)
    probablyNot[s] = ifelse(states[s]<(1-theta.probably)*n, 1, 0)
  }
  
  # as a matrix
  for (m in 1:length(messages)) {
    for (s in 1:length(states)) {
      semantics[m,s]=ifelse(m==1,certainly[s],ifelse(m==2,certainlyNot[s],ifelse(m==3,possibly[s],ifelse(m==4,probably[s],probablyNot[s]))))
    }
  }
  row.names(semantics)=messages 
  colnames(semantics)=states
  
  ## literal listener's beliefs, normalized
  for (s in 1:length(states)) {
    for (m in 1:length(messages)) {
      literal.bel[s,m]=semantics[m,s]*state.prior[s] 
    }
  }
  literal.bel=prop.table(literal.bel,2) 
  row.names(literal.bel)=states
  colnames(literal.bel)=messages 
  
  ## hypergeometric model as matrix V.inter by state
  # first, probability of observing o red balls having drawn a balls whenthere are n red balls in the urn
  for (v in 1:length(V.inter)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(O.inter[v],states[s],n-states[s],A.inter[v])
    }
  }
  row.names(hypergeometric)=V.inter  
  colnames(hypergeometric)=states
  
  # second, speaker's belief as bayes-inverted hypergeometric, normalized
  for (v in 1:length(V.inter)){
    for (s in 1:length(states)){
      speaker.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  speaker.bel=prop.table(speaker.bel,1)
  row.names(speaker.bel)=V.inter  
  colnames(speaker.bel)=states
  # as data frame
  df.beliefs=as.data.frame(melt(speaker.bel))
  colnames(df.beliefs)=c("value","state","probability")
  
  ## EU of a message given a value is negative HD between speaker.bel and literal.bel
  for (m in 1:length(messages)){
    for (v in 1:length(V.inter)){
      EU[m,v]= -HD(speaker.bel[v,], literal.bel[,m])
    }
  }
  row.names(EU)=messages 
  colnames(EU)=V.inter
  
  ## Speaker probability: probSpeaker(m|v)=exp(lambda*EU(m|v))
  speaker.prob=prop.table(exp(lambda*t(EU)),1)
  row.names(speaker.prob)=V.inter
  colnames(speaker.prob)=messages
  # as data frame
  df.speaker=as.data.frame(melt(speaker.prob))
  colnames(df.speaker)=c("value","answer","probability")
  
  # listerner probability: bayes-inverted speaker probabilities with prior over states, values and rational model of the urn
  for (m in 1:length(messages)){
    for (v in 1:length(V.inter)){
      for (s in 1:length(states)){
        listener.prob[m,v,s]=speaker.prob[v,m]*value.prior[v]*hypergeometric[v,s]*state.prior[s]
      }
    }
  }
  # normalize
  listener.prob=prop.table(listener.prob,1)
  
  # listener probability over states, ie marginalized: summed across V.inter
  for (m in 1:length(messages)){
    for (s in 1:length(states)){
      listener.prob.state[m,s]=sum(listener.prob[m,,s])
    }
  }
  # normalize
  listener.prob.state=prop.table(listener.prob.state,1)
  row.names(listener.prob.state)=messages 
  colnames(listener.prob.state)=states
  # as data frame
  df.listener.state=as.data.frame(melt(listener.prob.state))
  colnames(df.listener.state)=c("message","state","probability")
  
  # listener probability over V.inter, ie marginalized: summed across states
  for (m in 1:length(messages)){
    for (v in 1:length(V.inter)){
      listener.prob.value[m,v]=sum(listener.prob[m,v,])
    }
  }
  # normalize
  listener.prob.value=prop.table(listener.prob.value,1)
  row.names(listener.prob.value)=messages 
  colnames(listener.prob.value)=V.inter
  # as data frame
  df.listener.value=as.data.frame(melt(listener.prob.value))
  colnames(df.listener.value)=c("message","value","probability")
  
  # finally return predictions as dfs
  return(list(beliefs=df.beliefs,listener.state=df.listener.state,listener.value=df.listener.value))
}