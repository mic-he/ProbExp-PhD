require('dplyr')
require('bootstrap')
library('rjson')
library('stringr')
source('helpers.R')

## for bootstrapping 95% confidence intervals
theta <- function(x,xdata,na.rm=T) {mean(xdata[x],na.rm=na.rm)}
ci.low <- function(x,na.rm=T) {
  mean(x,na.rm=na.rm) - quantile(bootstrap(1:length(x),1000,theta,x,na.rm=na.rm)$thetastar,.025,na.rm=na.rm)}
ci.high <- function(x,na.rm=T) {
  quantile(bootstrap(1:length(x),1000,theta,x,na.rm=na.rm)$thetastar,.975,na.rm=na.rm) - mean(x,na.rm=na.rm)}

data = read.table("clean_data.csv", header=T, sep=",")
bins = read.csv("bins.txt",header=T)

data$id %>% unique %>% levels() -> ids
length(ids)

## each subject saw 13 random conditions out of 65
subj_condition=matrix(nrow = length(ids), ncol = 13)
for (i in 1:length(ids)){
  subj_condition[i,]=subset(data, data$id==ids[i])$condition
}

## data from wide to long, so that the bins are not columns but rows
d=data
d=melt(d, id.vars = c("id","trial","condition","acc","obs"), variable.name = "bin", value.name = "response")
d=arrange(d,id,trial,condition)

## binned histograms
binned_histogram = d %>%
  select(id, condition, bin, response) %>% 
  group_by(condition, id) %>% mutate(nresponse = normalize(response))
binned_histogram$bin_num = 1:11

y.slider = array(0, dim = c(length(ids),13,11))
  for (s in 1:length(ids)){
      for(b in 1:11){
        y.slider[s,,b]=subset(binned_histogram,binned_histogram$id==binned_histogram$id[s] & 
                                 binned_histogram$bin==binned_histogram$bin[b*s])$nresponse
    }
  }

y.slider = logit(add.margin(y.slider))

y.slider_means = binned_histogram %>% group_by(bin_num, condition) %>% 
  summarise(mymean = mean(nresponse),
            cilow  = mean(nresponse) - ci.low(nresponse),
            cihigh = mean(nresponse) + ci.high(nresponse)) 
y.slider_means = y.slider_means[order(y.slider_means$condition,y.slider_means$bin_num),]

## try plotting the data to see if it looks ok: huge plot!
sliderDataPlot = ggplot(y.slider_means, aes(x = bin_num, y = mymean)) +
  geom_point() + geom_line() + facet_wrap(~ condition, ncol = 13, scales = "free")
show(sliderDataPlot)

## save RData to be used in other scripts
save(ids,binned_histogram, y.slider, y.slider_means, subj_condition, file = "processed_data_bda.RData")
