### we source this file to obtain the two predictions functions; notice that many variables are undefined, and only specified in the analysis.r file

## production
predictions.sp = function(alpha, alpha_ax, beta, beta_ax, lambda,
                          theta.might, theta.probably, theta.certainly) {
  # betabinomial distribution as prior on states, alpha=1 makes it flat
  state.prior=c() 
  for (s in 1: length(states)){
    state.prior[s]=dbetabinom.ab(states[s],n, alpha, beta)
  }
  # thresholds for simple/nested expressions
  theta.possible=theta.might # possible, equal to might
  theta.likely=theta.probably # likely, equal to probable
  # init arrays etc 
  hypergeometric=matrix(nrow=length(V.prod),ncol=length(states))
  rational.bel=matrix(nrow=length(V.prod),ncol=length(states))
  likely=c()
  possible=c()
  unlikely=c()
  state.semantics=matrix(nrow=length(simple), ncol = length(states))
  literal.state.bel=matrix(nrow=length(states), ncol = length(simple))
  EU.simple=matrix(nrow=length(simple), ncol=length(V.prod))
  value.semantics=matrix(nrow=length(complex), ncol=length(V.prod))
  literal.value.bel=matrix(nrow=length(V.prod), ncol = length(complex))
  distances=matrix(nrow=length(V.prod), ncol=length(V.prod))
  avg.distance=matrix(nrow=length(complex), ncol=length(V.prod))
  EU.complex=matrix(nrow=length(complex), ncol=length(V.prod))
  speaker.prob=matrix(nrow=length(V.prod),ncol=length(messages))
  
  # hypergeometric model as matrix value by state
  for (v in 1:length(V.prod)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(O.prod[v],states[s],n-states[s],A.prod[v])
    }
  }
  row.names(hypergeometric)=V.prod  
  colnames(hypergeometric)=states
  
  # rational belief as bayes-inverted hypergeometric
  for (v in 1:length(V.prod)){
    for (s in 1:length(states)){
      rational.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  # normalize by state
  rational.bel=prop.table(rational.bel,1)
  row.names(rational.bel)=V.prod  
  colnames(rational.bel)=states
  # as data frame
  df.beliefs=as.data.frame(melt(rational.bel))
  colnames(df.beliefs)=c("value","state","probability")
  
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
  row.names(state.semantics)=simple 
  colnames(state.semantics)=states
  
  # listener's belief about states, having received a message m
  for (s in 1:length(states)) {
    for (m in 1:length(simple)) {
      literal.state.bel[s,m]=state.semantics[m,s]*state.prior[s] 
    }
  }
  # normalize
  literal.state.bel=prop.table(literal.state.bel,2)
  row.names(literal.state.bel)=states
  colnames(literal.state.bel)=simple
  
  # EU of simple message is negative distance between speaker distribution over outcomes given value and listener's distribution over outcome give message
  for (m in 1:length(simple)){
    for (v in 1:length(V.prod)){
      EU.simple[m,v]=-HD(rational.bel[v,], literal.state.bel[,m])
    }
  }
  row.names(EU.simple)=simple
  colnames(EU.simple)=V.prod
  
  # value semantics for complex messages relative to V.prod as function of state.semantics and rational.bel, 
  # complex messages use the "sum" rule
  for (v in 1:length(V.prod)){
    for (m in 1:3){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m,])>theta.certainly, 1, 0)#certainly
    }
    for (m in 4:6){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-3,])>theta.probably, 1, 0)#probably
    }
    for (m in 7:9){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-6,])>theta.might, 1, 0)#might
    }      
  }
  row.names(value.semantics)=complex 
  colnames(value.semantics)=V.prod
  
  # EU of complex messages minimizes avg distance between speaker's distribution given value and distrbutions induced in the listener by message
  # first compute a matrix value by value, containing the distances between each pair of distributions over states induces by V.prod
  for (v in 1:length(V.prod)){
    for (u in 1:length(V.prod)){
      distances[v,u]=HD(rational.bel[u,],rational.bel[v,])
    }
  }
  row.names(distances)=colnames(distances)=V.prod
  # calculate the literal listener's beliefs about (o,a) pairs given a message
  # start with prior beliefs
  ll.value.priors = 0
  for (v in 1:length(V.prod)){
    ll.value.priors[v] =  dbetabinom.ab(A.prod[v], size = 10, alpha_ax, beta_ax) * 
      sum(sapply(0:10, function(s) {dbetabinom.ab(s, size = 10, alpha, beta) * dhyper(O.prod[v], k = A.prod[v], m=s, n=10-s)}))
  }
  ll.value.posterior = value.semantics
  for (m in 1:length(ll.value.posterior[,1])){
    ll.value.posterior[m,] = ll.value.posterior[m,] * ll.value.priors
  }
  ll.value.posterior = prop.table(ll.value.posterior,1)
  # for each observed v and sent m we compute avg distance between speaker's bel and the listener's distributions that
  # are induced by V.prod compatible with received message m
  for (m in 1:length(complex)){
    for (v in 1:length(V.prod)){
      avg.distance[m,v]=distances[v,] %*% ll.value.posterior[m,]
    }
  }
  EU.complex=-avg.distance
  row.names(EU.complex)=complex
  colnames(EU.complex)=V.prod
  
  # speaker probability of sending m given v, conditional of kind of m
  for (m in 1:3){# first three messages are simple
    speaker.prob[,m]=exp(lambda*EU.simple[m,])
  }
  for (m in 4:length(messages)){# then the complex ones
    speaker.prob[,m]=exp(lambda*EU.complex[m-3,])
  }
  # normalize
  speaker.prob=prop.table(speaker.prob,1)
  row.names(speaker.prob)=V.prod
  colnames(speaker.prob)=messages
  # as data frame
  df.speaker=as.data.frame(melt(speaker.prob))
  colnames(df.speaker)=c("value","answer","probability")
  
  # finally return predictions as dfs
  return(list(speaker=df.speaker))
}

## interpretation
predictions.li = function(alpha,alpha_ax,beta,beta_ax,lambda,theta.might,theta.probably,theta.certainly) {
  state.prior=c()
  for (s in 1: length(states)){
    state.prior[s]=dbetabinom.ab(states[s],n, alpha, beta)
  }
  # prior over V: assume betabinom distrib over access and flat over observations
  # each value v=<a,o> is associated with the probability that a betabinom distribution associates to the corresponding access a
  access.prior=c() # betabin prior on access values
  for (v in 1: length(V)){
    access.prior[v]=dbetabinom.ab(A.inter[v],n, alpha_ax, beta_ax)
  }
  # normalizing this we obtain distribution over V
  value.prior=prop.table(access.prior)
  # thresholds for simple/nested expressions
  theta.possible=theta.might # possible, equal to might
  theta.likely=theta.probably # likely, equal to probable
  # init arrays etc 
  hypergeometric=matrix(nrow=length(V),ncol=length(states))
  rational.bel=matrix(nrow=length(V),ncol=length(states))
  likely=c()
  possible=c()
  unlikely=c()
  state.semantics=matrix(nrow=length(simple), ncol = length(states))
  literal.state.bel=matrix(nrow=length(states), ncol = length(simple))
  EU.simple=matrix(nrow=length(simple), ncol=length(V))
  value.semantics=matrix(nrow=length(complex), ncol=length(V))
  literal.value.bel=matrix(nrow=length(V), ncol = length(complex))
  distances=matrix(nrow=length(V), ncol=length(V))
  avg.distance=matrix(nrow=length(complex), ncol=length(V))
  EU.complex=matrix(nrow=length(complex), ncol=length(V))
  speaker.prob=matrix(nrow=length(V),ncol=length(messages))
  listener.prob=array(dim=c(length(messages),length(V),length(states)))
  listener.prob.state=matrix(nrow=length(messages),ncol=length(states))
  listener.prob.value=matrix(nrow=length(messages),ncol=length(V))
  
  # hypergeometric model
  for (v in 1:length(V)){
    for (s in 1:length(states)){
      hypergeometric[v,s]=dhyper(O.inter[v],states[s],n-states[s],A.inter[v])
    }
  }
  row.names(hypergeometric)=V  
  colnames(hypergeometric)=states
  
  # rational belief as bayes-inverted hypergeometric
  for (v in 1:length(V)){
    for (s in 1:length(states)){
      rational.bel[v,s]=hypergeometric[v,s]*state.prior[s]
    }
  }
  # normalize by state
  rational.bel=prop.table(rational.bel,1)
  row.names(rational.bel)=V  
  colnames(rational.bel)=states
  # as data frame
  df.beliefs=as.data.frame(melt(rational.bel))
  colnames(df.beliefs)=c("value","state","probability")
   
  # state semantics for simple messages
  # literal semantics relative to states: matrix message by state as a function of theta(s), usual threshold meaning
  # truth-conditions
  for (s in 1:length(states)) { # three basic messages
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
  row.names(state.semantics)=simple 
  colnames(state.semantics)=states
  
  # listener's belief about states, having received a message m
  for (s in 1:length(states)) {
    for (m in 1:length(simple)) {
      literal.state.bel[s,m]=state.semantics[m,s]*state.prior[s] 
    }
  }
  # normalize
  literal.state.bel=prop.table(literal.state.bel,2)
  row.names(literal.state.bel)=states
  colnames(literal.state.bel)=simple
  
  # EU of simple message is negative distance between speaker distribution over outcomes given value and listener's distribution over outcome give message
  for (m in 1:length(simple)){
    for (v in 1:length(V)){
      EU.simple[m,v]=-HD(rational.bel[v,], literal.state.bel[,m])
    }
  }
  row.names(EU.simple)=simple
  colnames(EU.simple)=V
  
  # value semantics for complex messages relative to V as function of state.semantics and rational.bel, 
  # complex messages use the "sum" rule
  for (v in 1:length(V)){
    for (m in 1:3){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m,])>theta.certainly, 1, 0)#certainly
    }
    for (m in 4:6){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-3,])>theta.probably, 1, 0)#probably
    }
    for (m in 7:9){
      value.semantics[m,v]=ifelse(sum(rational.bel[v,]*state.semantics[m-6,])>theta.might, 1, 0)#might
    }      
  }
  row.names(value.semantics)=complex 
  colnames(value.semantics)=V
  
  # literal listener's belief over V: uniformly choose among the V compatible with received complex message
  TMPmatrix=matrix(nrow=length(V), ncol = length(complex))
  for (v in 1:length(V)) {
    for (m in 1:length(complex)) {
      TMPmatrix[v,m]=value.prior[v]*value.semantics[m,v] 
    }
  }
  for (v in 1:length(V)) {
    for (m in 1:length(complex)){# the complex messages, normalize
      literal.value.bel[v,m]=TMPmatrix[v,m]/sum(TMPmatrix[,m])
    }
  }
  row.names(literal.value.bel)=V
  colnames(literal.value.bel)=complex
  
  # EU of complex messages minimizes avg distance between speaker's distribution given value and distrbutions induced in the listener by message
  # first compute a matrix value by value, containing the distances between each pair of distributions over states induces by V
  for (v in 1:length(V)){
    for (u in 1:length(V)){
      distances[v,u]=HD(rational.bel[u,],rational.bel[v,])
    }
  }
  row.names(distances)=colnames(distances)=V
  # calculate the literal listener's beliefs about (o,a) pairs given a message
  # start with prior beliefs
  ll.value.priors = 0
  for (v in 1:length(V.prod)){
    ll.value.priors[v] =  dbetabinom.ab(A.prod[v], size = 10, alpha_ax, beta_ax) * 
      sum(sapply(0:10, function(s) {dbetabinom.ab(s, size = 10, alpha, beta) * dhyper(O.prod[v], k = A.prod[v], m=s, n=10-s)}))
  }
  ll.value.posterior = value.semantics
  for (m in 1:length(ll.value.posterior[,1])){
    ll.value.posterior[m,] = ll.value.posterior[m,] * ll.value.priors
  }
  ll.value.posterior = prop.table(ll.value.posterior,1)
  # for each observed v and sent m we compute avg distance between speaker's bel and the listener's distributions that
  # are induced by V.prod compatible with received message m
  for (m in 1:length(complex)){
    for (v in 1:length(V.prod)){
      avg.distance[m,v]=distances[v,] %*% ll.value.posterior[m,]
    }
  }
  EU.complex=-avg.distance
  row.names(EU.complex)=complex
  colnames(EU.complex)=V
  
  # speaker probability of sending m given v, conditional of kind of m (full set of V, for the interpretation task)
  for (m in 1:3){# first three messages are simple
    speaker.prob[,m]=exp(lambda*EU.simple[m,])
  }
  for (m in 4:length(messages)){# then the complex ones
    speaker.prob[,m]=exp(lambda*EU.complex[m-3,])
  }
  # normalize
  speaker.prob=prop.table(speaker.prob,1)
  row.names(speaker.prob)=V
  colnames(speaker.prob)=messages
  
  # listerner probability: bayes-inverted speaker probabilities with prior over states, values and rational model of the urn
  for (m in 1:length(messages)){
    for (v in 1:length(V)){
      for (s in 1:length(states)){
        listener.prob[m,v,s]=speaker.prob[v,m]*value.prior[v]*hypergeometric[v,s]*state.prior[s]
      }
    }
  }
  # normalize
  listener.prob=prop.table(listener.prob,1)
  
  # listener probability over states, ie marginalized: summed across V
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
  
  # listener probability over V, ie marginalized: summed across states
  for (m in 1:length(messages)){
    for (v in 1:length(V)){
      listener.prob.value[m,v]=sum(listener.prob[m,v,])
    }
  }
  # normalize
  listener.prob.value=prop.table(listener.prob.value,1)
  row.names(listener.prob.value)=messages 
  colnames(listener.prob.value)=V
  # as data frame
  df.listener.value=as.data.frame(melt(listener.prob.value))
  colnames(df.listener.value)=c("message","value","probability")
  
  # finally return predictions as dfs
  return(list(beliefs=df.beliefs,listener.state=df.listener.state,listener.value=df.listener.value))
}