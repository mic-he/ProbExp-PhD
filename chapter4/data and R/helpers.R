library('dplyr')
library('ggplot2')
library('reshape2')

logit = function(x, k = 1) k * log(x / (1-x))
logistic = function(x, k = 1, zero = 0) 1 / (1 + exp(-1/k*(x - zero)))
add.margin <- function(x, eps = 0.000001) (1 - 2*eps)*x + eps 
# calibrate <- function(x) (x - min(x)) / (max(x) - min(x))
normalize <- function(x) (x / sum(x))

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
HDIofMCMC = function( sampleVec , credMass = 0.95 ) {
  sortedPts = sort( sampleVec )
  ciIdxInc = ceiling( credMass * length( sortedPts ) )
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


# get the all the samples into a data.frame
# first get the parameters, and the the posterior predictive values
# otherwise it messes with the number of bins; until now: only sliderPPC
construct_ppvs <- function(samples, ppv = 'y.sliderPPC') {
  slist <- samples$BUGSoutput$sims.list
  ppv_df <- slist[[ppv]]
  ppv_df <- tbl_df(melt(ppv_df))
  
  # poor man's solution as of yet
  if (ppv == 'y.sliderPPC') {
    bins <- rep(bin_dat$bin_num, each = max(ppv_df$Var1))
    items <- rep(bin_dat$tag, each = max(ppv_df$Var1))
    workerid = rep(bin_dat$workerid, each = max(ppv_df$Var1))
    ppv_df <- ppv_df %>%
                mutate(item = items, bin = bins, variable = ppv, workerid) %>% select(1, 2, 5, 7, 4, 6 ,3)
    ppv_df$value = logistic(ppv_df$value)
    ppv_df = ppv_df %>%
                group_by(item, Var1, workerid ) %>%
                mutate(nvalue = value / sum(value)) # normalise slider PPCs
      
  } else if (ppv == 'y.numberPPC') {
    ppv_df$variable <- ppv
    items <- rep(number_dat$tag, each = max(ppv_df$Var1))
    ppv_df <- ppv_df %>% 
                mutate(item = items) %>% 
                select(1, 2, 4, 5, 3)
  } else {
    ppv_df$variable <- ppv
    items <- rep(choice_dat$tag, each = max(ppv_df$Var1))
    ppv_df <- ppv_df %>% 
                mutate(item = items) %>% 
                select(1, 2, 4, 5, 3)
  }
  
  names(ppv_df) <- c('sample', 'step', names(ppv_df)[3:ncol(ppv_df)])
  ppv_df
}




get_ppv <- function(ppv_df, y_emp, sampl = 1) {
  ppv_df %>% filter(step == sampl) %>% mutate(y_emp = y_emp)
}


aggregate_ppv_slider <- function(ppv_df, bin_dat) {
  empData = bin_dat %>% group_by(bin_num, tag) %>% 
    summarise(mymean = mean(nresponse))
  out = ppv_df %>% 
    group_by(bin, item) %>%
    summarise(
      mean = mean(nvalue),
      max = HDIofMCMC(nvalue)[2],
      min = HDIofMCMC(nvalue)[1]
    ) %>%
    tbl_df
  out$y_emp = empData$mymean
  out
}

aggregate_ppv_number <- function(ppv_df, data_number) {
  DN = as.data.frame(data_number)
  DNm = melt(table(DN$item.number, DN$y.number))
  colnames(DNm) = c("item", "bin", "count")
  DNm$item = levels(number_dat$tag)[DNm$item]
  
  ppcM = melt(table(ppv_df$item, ppv_df$value))
  ppcM = ppcM %>% mutate(proportion = value / (20* nrow(ppv_df) / 160)) %>%
    rename(item = Var1, bin = Var2) %>% mutate(propEmp = DNm$count/20)
  
  ppcM
}


plot_ppvMF <- function(ppv, type = 'sliderBins') {
  if (type == 'sliderBins') {
    ggplot(ppv, aes(x = bin, y = mean)) + geom_line() + geom_point() + facet_wrap(~ item, scale = "free") + 
      geom_errorbar(aes(ymin = min, ymax = max), width = .5, position = position_dodge(.1), color = 'gray') +
      geom_line( aes(x = bin, y = y_emp) , color = "red") # + geom_point( aes(x = bin, y = y_emp) , color = "red")
  } else if (type == 'numberChoice') {
    ggplot(ppv, aes(x = bin, y = proportion)) + geom_bar(color = "black", fill = "gray", stat = 'identity') + 
      facet_wrap(~ item, scale = "free") + 
      geom_line( aes(x = bin, y = propEmp) , color = "red") # + geom_point( aes(x = bin, y = y_emp) , color = "red")
  } else {
    stop("Plotting of PPCs only implemented for task type 'sliderBins' and 'numberChoice'.")
  }
  
}

plot_ppv <- function(ppv, type, items = unique(ppv$item)) {
  pred <- melt(select(ppv, value, y_emp, item))
  pred <- filter(pred, item %in% items)
  predicted <- filter(pred, variable == 'value')
  empirical <- filter(pred, variable == 'y_emp')
  
  if (type == 'numberPPC') {
    ggplot(pred, aes(x = value, fill = variable)) +
      geom_histogram(data = predicted, fill = 'red', alpha = .2) +
      geom_histogram(data = empirical, fill = 'blue', alpha = .2) +
      theme(axis.text = element_text(size = 14), axis.title = element_text(size = 20),
            plot.title = element_text(size = 20, face = 'bold'),
            strip.text.x = element_text(size = 14)) +
      labs(x = 'chosen bin', title = 'Posterior Predictive for Number') +
    
      # not working as of yet!
      scale_fill_manual(name = 'legend',
                        values = c('red', 'blue'),
                        labels = c('value', 'y_emp')) + facet_wrap( ~ item, ncol = 4)
  } else {
    ggplot(pred, aes(x = value, fill = variable)) +
      geom_density(data = predicted, fill = 'red', alpha = .2) +
      geom_density(data = empirical, fill = 'blue', alpha = .2) +
      theme(axis.text = element_text(size = 14), axis.title = element_text(size = 20),
            plot.title = element_text(size = 20, face = 'bold'),
            strip.text.x = element_text(size = 14)) +
      labs(x = 'normalized response', title = 'Posterior Predictive for Slider') +
      
      facet_wrap( ~ item, ncol = 4)
  }
}


plot_populationPriors <- function(slider_ppv, aggr_slider) {
  meansIP <- csamples %>% filter(variable == "item.pop") %>%
    group_by(bin, item) %>%
    summarise(
      mean = mean(value),
      max = HDIofMCMC(value)[2],
      min = HDIofMCMC(value)[1]
    ) %>%
    mutate(item = levels(bin_dat$tag)[item])
  meansIP$y_emp = aggr_slider$y_emp
  
  ggplot(meansIP, aes(x = bin, y = mean)) + geom_line() + geom_point() + facet_wrap(~ item, scale = "free") +  
    geom_errorbar(aes(ymin = min, ymax = max), width = .5, position = position_dodge(.1), color = 'gray') +
    geom_line(aes(x = bin, y = y_emp) , color = "red")  + geom_point(aes(x = bin, y = y_emp ), color = "red")
}

plot_parameters <- function(p = c("a", "b", "w", "sigma", "k.skewGlobal")) {
  meansIP <- csamples %>% filter(variable %in% p) %>%
    group_by(variable) %>%
    summarise(
      mean = mean(value),
      max = HDIofMCMC(value)[2],
      min = HDIofMCMC(value)[1]
    )
  
  plotData = csamples %>% select(value, variable) %>% filter(variable %in% p)
  plotData$maxHDI = unlist(sapply(1:nrow(plotData), function(x) meansIP[which(meansIP$variable == plotData$variable[x]), 3]))
  plotData$minHDI = unlist(sapply(1:nrow(plotData), function(x) meansIP[which(meansIP$variable == plotData$variable[x]), 4]))
  
  ggplot(plotData, aes(x = value)) + geom_density() + facet_wrap(~ variable, scales = "free")
}

KL = function(x,y) {
  # calculate Kullback-Leibler divergence
  if ( length(setdiff(which(y==0), which(x==0))) !=0){
    # if y=0 does not imply x=0
    return(NaN)
  }
  t = (x*log(x/y))
  t[is.nan(t)] = 0   # override harmless NaN-values
  return(sum(t))
}

mean_KL_divergence = function(){
  out <- csamples %>% filter(variable == "item.pop")
  out$item = levels(bin_dat$tag)[out$item]
  out = out %>%
    group_by(item, step) %>%
    summarise(
      KL = KL(value, subset(aggr_slider, aggr_slider$item == item)$y_emp)
    )
  out = out %>% group_by(item) %>%
    summarize(meanKL = mean(KL))
  return(out)
} 


## generate two vectors of integers, access and observation, for each possible combination where o<=a and n=10
valuesF = function(){
  acc<-c()
  obs<-c()
  for (i in 10:(11*10)) {
    if (i%%10<=i%/%10){
      acc=append(acc,i%/%10)
      obs=append(obs,i%%10)
    }
  }
  acc[length(acc)]=10
  obs[length(obs)]=10
  val=acc*10+obs
  val[length(val)]=1010 #fix the last value
  return(list(accessValues=acc, observationValues=obs, values=val))
}

## MCMC chain handling
extractSamples = function(ms, parameter) {
  if ( parameter %in% levels(ms$Parameter) ) {
    out = droplevels(filter(ms, Parameter == parameter))
  } else {
    out = droplevels(ms[grep(paste0("^",parameter,"[\\[$]"), ms$Parameter),])
  }
  if (nrow(out) == 0) {
    stop(paste0("Chosen parameter '" , parameter, "' is not in parameter list!"))
  } else {
    return(out)
  }
}

getSlice = function(ms, parameter, chain = 1 , iteration = 1) {
  ms = extractSamples(ms, parameter)
  vectorFlag = ! grepl(",", ms$Parameter[1], fixed = TRUE) # whether we have a vector
  singletonFlag = ! grepl("[", ms$Parameter[1], fixed = TRUE) # whether we have a singleton
  paraLevs = levels(ms$Parameter)
  if (singletonFlag) {
    rowMax = 1
    colMax = 1
    return(filter(ms, Chain == chain, Iteration == iteration)$value)
  } else if (vectorFlag) {
    rowMax = 1
    colMax = max(as.numeric(sapply(paraLevs, 
                                   function(p) substr(p,
                                                      start = regexpr("[", p, fixed = TRUE)[[1]] + 1, 
                                                      stop  = regexpr("]", p, fixed = TRUE)[[1]] - 1)))  )
  } else {
    rowMax = max(as.numeric(sapply(paraLevs, 
                                   function(p) substr(p,
                                                      start = regexpr("[", p, fixed = TRUE)[[1]] + 1, 
                                                      stop  = regexpr(",", p, fixed = TRUE)[[1]] - 1)))  )
    colMax = max(as.numeric(sapply(paraLevs, 
                                   function(p) substr(p,
                                                      start = regexpr(",", p, fixed = TRUE)[[1]] + 1, 
                                                      stop  = regexpr("]", p, fixed = TRUE)[[1]] - 1)))  )
  }
  matrix(filter(ms, Chain == chain, Iteration == iteration)$value[1:(colMax*rowMax)], nrow = rowMax, ncol = colMax)
}

mcmcPlot = function(ms, parameter) {
  # specify parameter name or supply a vector
  ms = extractSamples(ms, parameter)
  nc = max(ms$Chain)
  vectorFlag = ! grepl(",", ms$Parameter[1], fixed = TRUE) # whether we have a vector
  singletonFlag = ! grepl("[", ms$Parameter[1], fixed = TRUE) # whether we have a singleton
  plotData = ms %>% group_by(Parameter,Chain) %>% 
    summarise(HDIlow95  = HPDinterval(as.mcmc(value), prob = 0.95)[1],
              HDIlow80  = HPDinterval(as.mcmc(value), prob = 0.80)[1],
              mean = mean(value),
              HDIhigh80 = HPDinterval(as.mcmc(value), prob = 0.80)[2],
              HDIhigh95 = HPDinterval(as.mcmc(value), prob = 0.95)[2])
  if (singletonFlag) {
    plotData$col = 1
  } else if ( vectorFlag ){
    plotData$col = as.numeric(sapply(1:nrow(plotData), 
                                     function(i) substr(plotData$Parameter[i],
                                                        start = regexpr("[", plotData$Parameter[i], fixed = TRUE)[[1]] + 1, 
                                                        stop  = regexpr("]", plotData$Parameter[i], fixed = TRUE)[[1]] - 1)))
  } else {
    plotData$row = as.numeric(sapply(1:nrow(plotData), 
                                     function(i) substr(plotData$Parameter[i],
                                                        start = regexpr("[", plotData$Parameter[i], fixed = TRUE)[[1]] + 1, 
                                                        stop  = regexpr(",", plotData$Parameter[i], fixed = TRUE)[[1]] - 1)))
    plotData$col = as.numeric(sapply(1:nrow(plotData), 
                                     function(i) substr(plotData$Parameter[i],
                                                        start = regexpr(",", plotData$Parameter[i], fixed = TRUE)[[1]] + 1, 
                                                        stop  = regexpr("]", plotData$Parameter[i], fixed = TRUE)[[1]] - 1)))
  }
  plotData$Chain = factor(plotData$Chain)
  outPlot = ggplot() + 
    geom_linerange(data = plotData, 
                   mapping = aes(x = col, y = mean, 
                                 ymin = HDIlow95, ymax = HDIhigh95, 
                                 color = Chain), size = 0.75) +
    geom_linerange(data = plotData, 
                   mapping = aes(x = col, y = mean, 
                                 ymin = HDIlow80, ymax = HDIhigh80, 
                                 color = Chain), size = 1.75) +
    geom_point(data = plotData, 
               mapping = aes(x = col, y = mean, 
                             shape = Chain), size = 3.5) + scale_shape(solid = FALSE) +
    ylab("estimate") + xlab("column")
  if (!vectorFlag) {
    outPlot = outPlot + facet_wrap(~ row, scales = "free", nrow = 6)
  }
  return(outPlot)
}

