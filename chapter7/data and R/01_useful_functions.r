# functions to bootstrap
proportion <- function(x,y){sum(x==y)/length(x)} # x must be a vector of choices in a given conditions, y is a message
percentage <- function(x,y){100*sum(x==y)/length(x)}
count <- function(x,y){sum(x==y)}
# ci.low and ci.high
ci.low <- function(x,na.rm=T) {mean(x,na.rm=na.rm) - quantile(x,.025,na.rm=na.rm)}
ci.high <- function(x,na.rm=T) {quantile(x,.975,na.rm=na.rm) - mean(x,na.rm=na.rm)}

## generate three vectors of integers for each possible combination where 0<=n<=10, a>=1, o<=a<=n  
## eg value=98 represent the pair <a,o> with a=9 and 0=8
valuesF = function(){
  acc=c()
  obs=c()
  val=c()
  n=10
  for (i in n:(11*n)) {
    if (i%%n<=i%/%n){
      acc=append(acc,i%/%n)
      obs=append(obs,i%%n)
    }
  }
  acc[length(acc)]=n
  obs[length(obs)]=n
  val=acc*10+obs
  val[length(val)]=1010 #ad hoc fixing of the last value
  return(list(accessValues=acc, observationValues=obs, pairValues=val))
}

######################################################################

## Distances/divergences between discrete distributions

KL = function(x,y) {
  # Kullback-Leibler divergence
  if ( length(setdiff(which(y==0), which(x==0))) !=0){
    # if y=0 does not imply x=0
    return(Inf)
  }
  t = (x*log(x/y))
  t[is.nan(t)] = 0   # override harmless NaN-values
  return(sum(t))
}

JS = function(x,y) {
  # Jensen-Shannon divergence
  m = 0.5*(x+y)
  t = 0.5*KL(x,m)+0.5*KL(y,m)
  return(t)
}


HD = function(x, y){
  # Hellinger distance
  return( sqrt(sum(sapply(1:length(x), function(i) (sqrt(x[i]) - sqrt(y[i]))^2  )) ) / (sqrt(2)) )
}

## examples
# x = c(0,0.3,0.7)
# y = c(0.1,0.2,0.7)
# z = c(0.9,0.05, 0.05)
# 
# show(KL(x,y))
# show(KL(y,x))
# show(KL(z,y)) # divergence can go beyong 1!
# show(KL(x,x))
# 
# show(HD(x,y))
# show(HD(y,x))
# show(HD(z,y))
# show(HD(c(1,0,0), c(0,1,0))) # maximal distance is 1!
# show(HD(x,x))

######################################################################

HDIofMCMC = function( sampleVec , credMass=0.95 ) {
  # Computes highest density interval from a sample of representative values,
  #   estimated as shortest credible interval.
  # Arguments:
  #   sampleVec
  #     is a vector of representative values from a probability distribution.
  #   credMass
  #     is a scalar between 0 and 1, indicating the mass within the credible
  #     interval that is to be estimated.
  # Value:
  #   HDIlim is a vector containing the limits of the HDI
  sortedPts = sort( sampleVec )
  ciIdxInc = floor( credMass * length( sortedPts ) )
  nCIs = length( sortedPts ) - ciIdxInc
  ciWidth = rep( 0 , nCIs )
  for ( i in 1:nCIs ) {
    ciWidth[ i ] = sortedPts[ i + ciIdxInc ] - sortedPts[ i ]
  }
  HDImin = sortedPts[ which.min( ciWidth ) ]
  HDImax = sortedPts[ which.min( ciWidth ) + ciIdxInc ]
  HDIlim = c( HDImin , HDImax )
  return( HDIlim )
}