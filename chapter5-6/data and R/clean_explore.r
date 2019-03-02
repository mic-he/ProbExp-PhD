### preliminary data cleaning, exploration and visualization for the simple expressions experiments
### computation of bootstrapped confidence intervals
### bayesian regression analysis

## libraries, sources, data
# manipulation
library(tidyverse)
library(reshape2)
# visualization
library(ggplot2)
library(RColorBrewer)
library(hexbin)
library(gridExtra)
# analysis: classic stat
library(mlogit) # multinomial logistic regression
library(VGAM) # dbetabinom.ab distribution is here
library(bootstrap) # bootstrap function for confidence intervals
# bayesian stuff
library(brms) # bayesian regression models based on STAN
library(bayesplot) # plot estimated posterior coefficients
options(mc.cores = parallel::detectCores()) # multicore parallel computation


# source functions
source("useful_functions.r") # various useful definitions
source("prediction_functions.r") # the prediction functions, ie R implementation of the model 

# get data
df.production=read.csv("raw_production_data.csv",sep=";") # raw data from simple expression v2 production task
df.interpretation=read.csv("raw_interpretation_data.csv",sep=";") # raw data from simple expression interpretation task
df.observed.belief=read.csv("observed_belief.csv") # processed data from belief-about-the-urn task

## production task: clean and explore
xdf.production <- df.production

# how many subjects?
xdf.production$id %>% unique() %>% length()
# 89

# randomization of experimental conditions
xtabs(~value, xdf.production)

# reported languages
xdf.production$language %>% levels()
#[1] "American English" "english"          "English"          "english "         "Russian"          "tamil"           
#[7] "Tamil"            "Turkish"          "Ukrainian"   

# drop non native english speaker
xdf.production=droplevels(subset(xdf.production,xdf.production$language=="American English" | 
                                   xdf.production$language=="English" |
                                   xdf.production$language=="english" |
                                   xdf.production$language=="english "))

# how many subjects left?
xdf.production$id %>% unique() %>% length()

# comments
xdf.production$comments %>% levels()
# interesting output:
# [7] "I think it has to be 100% to be certain "
# [8] "Interesting task! Love you guys. Mwah"
# [28] "To do certain things"

# reported difficulty
xtabs(~difficulty, xdf.production)/9 # 9 is the number of trials completed by each participant

# produce and save a more compact, better looking data frame with less "useless" columns and a couple more useful columns
xdf.production$comments<-xdf.production$engagement<-xdf.production$difficulty<-xdf.production$language<-NULL
# add column with level of high-order uncertainty
xdf.production$uncertainty=ifelse(xdf.production$access==10,"none",ifelse(xdf.production$access>5,"low","high"))
# save (to be used in analysis.r)
write.csv(xdf.production,"clean_production_data.csv", row.names = FALSE)

# visualize expression choices in each condition with bar plots
# get counts of expression per condition
counts=t(xtabs(~answer+value,xdf.production))
# how many observation for each condition?
observations=as.vector(xtabs(~value,xdf.production))
# counts to percentage, as data frame
df.e=as.data.frame(melt(counts/observations*100))
colnames(df.e)=c("value","expression","percentage")
# add some columns to df for easier visualization
df.e$access=ifelse(df.e$value==1010,10,trunc(df.e$value/10))
df.e$observation=ifelse(df.e$value==1010,10,df.e$value-10*df.e$access)
# better looking labels for values
df.e$label=as.factor(paste0(df.e$observation," red balls out of ",df.e$access))
# better looking names for expressions
levels(df.e$expression)=c("certainly","certainly not","possibly","probably","probably not")
# change order of some factors to make plot more readable
df.e$label = factor(df.e$label,levels(df.e$label)[c(1,3,6,9,5,2,7,10,12,15,4,8,11,13,14)])
df.e$expression = factor(df.e$expression,levels(df.e$expression)[c(2,5,3,4,1)])
# plot
expression.bars=ggplot(data=df.e)+geom_bar(aes(x=expression,y=percentage,fill=expression),stat="identity")+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,10))+coord_flip()+facet_wrap(facets = ~label, ncol=5)+
  theme_bw()+theme(strip.background = element_blank(),text=element_text(size=20), legend.position="none")
show(expression.bars)


## add bootstrapped 95% CIs
values <- levels(as.factor(xdf.production$value)) # experimental conditions
expressions <- levels(xdf.production$answer)
repetitions <- 1000 # how many samples?

# output is array values x expressions x repetitions, output1 is values x expressions x 3 (ci.low, mean, ci.high)
output <- array(dim=c(length(values),length(expressions),repetitions),dimnames = list(values,expressions,c(1:repetitions)))
output1 <- array(dim=c(length(values),length(expressions),3),dimnames = list(values,expressions,c("ci.low","mean","ci.high")))
for (v in 1:length(values)){ # for each condition...
  choices <- subset(xdf.production, xdf.production$value==values[v])$answer # get the vector with observed answers
  for (e in 1:length(expressions)){
    output[v,e,] <- bootstrap(x=choices,nboot=repetitions,theta = percentage,expressions[e])$thetastar
    output1[v,e,] <- c(ci.low(output[v,e,]),mean(output[v,e,]),ci.high(output[v,e,]))
  }
}
# as df
df.e.cis <- as.data.frame(cbind(melt(output1[,,1]),melt(output1[,,2])$value,melt(output1[,,3])$value))
colnames(df.e.cis) <- c("value","message","ci.low","mean","ci.high")
# save
write.csv(df.e.cis,"simple_production_cis.csv", row.names = FALSE)


## Bayesian statistics
# ordinal bayesian regression on answer choices
tempdata <- xdf.production
tempdata <- mutate(tempdata, answer=factor(answer, ordered = TRUE, levels = c("certainlyNot","probablyNot","possibly","probably","certainly")))

# first model: participants' answer given access and observation
mb0 <- brm(formula = answer ~ access + observation, data = tempdata, family = cumulative)
summary(mb0)
# get posterior
ps0 = posterior_samples(mb0) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps0_summary = ps0 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps0_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb0), regex_pars = "b_")

# does adding interaction result in better model?
mb0i <- brm(formula = answer ~ access * observation, data = tempdata, family = cumulative)
summary(mb0i)
# get posterior
ps0i = posterior_samples(mb0i) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps0i_summary = ps0i %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps0i_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb0i), regex_pars = "b_")

# second model: participants' answer given proportion
tempdata <- mutate(tempdata, proportion=observation/access)
mb1 <- brm(formula = answer ~ proportion, data = tempdata, family = cumulative)
summary(mb1)
# get posterior
ps1 = posterior_samples(mb1) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps1_summary = ps1 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps1_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb1), regex_pars = "b_")

# first model comparison between these three, with loo
loo(mb0,mb0i,mb1)
# lower is better
# -> mb0 is better

# how about removing access and keeping only observation? is access really crucial?
mb0obs <- brm(formula = answer ~ observation, data = tempdata, family = cumulative)
summary(mb0obs)
# get posterior
ps0obs = posterior_samples(mb0obs) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps0obs_summary = ps0obs %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps0obs_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb0obs), regex_pars = "b_")

# model comparison
loo(mb0,mb0obs)

## next, fit two models with mode and ev of avg measured beliefs, then compare 
# first, take subset of observed beliefs df picking only the values <a,o> that we care about
xdf.observed.belief <- droplevels(subset(df.observed.belief,df.observed.belief$value %in% xdf.production$value))
# then add the point estimates to each row of the full df, as function of corresponding value
for(v in 1:length(xdf.production[,1])){
  xdf.production$obs_bel_mode[v]=c(0:10)[which.max(subset(xdf.observed.belief,xdf.observed.belief$value==xdf.production$value[v])$mean)]
  xdf.production$obs_bel_ev[v]=sum(c(0:10)*subset(xdf.observed.belief,xdf.observed.belief$value==xdf.production$value[v])$mean)
}

# new tempdata df and set reference level again
tempdata <- xdf.production
tempdata <- mutate(tempdata, answer=factor(answer, ordered = TRUE, levels = c("certainlyNot","probablyNot","possibly","probably","certainly")))

# model with mode of beliefs
mb2 <- brm(formula = answer ~ obs_bel_mode, data = tempdata, family = cumulative)
summary(mb2)
# get posterior
ps2 = posterior_samples(mb2) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps2_summary = ps2 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps2_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb2), regex_pars = "b_")

# model with ev of beliefs
mb3 <- brm(formula = answer ~ obs_bel_ev, data = tempdata, family = cumulative)
summary(mb3)
# get posterior
ps3 = posterior_samples(mb3) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
ps3_summary = ps3 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
ps3_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(mb3), regex_pars = "b_")

# second model comparison between the best mb0 and the new ones
loo(mb0,mb2,mb3)
# lower is better
# LOOIC    SE
# mb0       1596.98 66.36
# mb2       1693.34 57.31
# mb3       1625.14 64.71



############################################################################



## interpretation task: clean and explore
xdf.interpretation <- df.interpretation

# how many subjects?
xdf.interpretation$id %>% unique() %>% length()
# 147

# reported languages
xdf.interpretation$language %>% levels()
# [1] "A1F9KLZGHE9DTA" "eng"            "Engish"         "Englisg"        "english"        "English"        "ENGLISH"       
# [8] "English "       "englisj"        "Turkish" 


# drop non native english speakers
xdf.interpretation=droplevels(subset(xdf.interpretation,xdf.interpretation$language!="A1F9KLZGHE9DTA" & xdf.interpretation$language!="Turkish"))

# how many subjects left?
xdf.interpretation$id %>% unique() %>% length()
# 145

# comments
xdf.interpretation$comments %>% levels()
# interesting output:
# [6] "I had to stop and think about all the possibilities. I have most likely overestimated in some instances, but my responses should still fit the bill. Thanks."  
# [8] "In the future, please put the overall scale back on the remaining screens after the warm-up. I'm fairly certain that the 'probable' as the center and 'possible' was just below it, but I'm not COMPLETELY certain. This is important because people will estimate in ranges of 20% (there were 5 choices) if they are rational. Or even if they are not, numbers and probabilities still dictate our intuitive responses, contra aesthetic theorists. Good luck with the results!"
# [10] "Interesting but completely random task unless more than 5 balls are taken all with the same color " 
# [15] "It was hard guessing like that. It really made me think. Interesting task, though."  
# [41] "That was interesting because there were so many ways to look at it." 
# [43] "The task was pretty confusing." 
# [46] "This was interesting, but confusing for me, too."  

# reported difficulty
xtabs(~difficulty, xdf.interpretation)/10 # 10 is the number of trials completed by each participant

# has anybody said acc=0 and obs=0 for any expression?
xdf.interpretation %>% filter(access==0 & observation==0) %>% select(id) %>% n_distinct()
# 1
# drop it
pessimists=levels(droplevels(subset(xdf.interpretation, xdf.interpretation$access==0 & xdf.interpretation$observation==0))$id)
xdf.interpretation=droplevels(subset(xdf.interpretation,!xdf.interpretation$id %in% pessimists))
# how many subjects left?
xdf.interpretation$id %>% unique() %>% length()
# 144

# produce and save a more compact, better looking data frame
# rename expression levels, to make them more readable and match names in production experiment and model
xdf.interpretation$expression=ifelse(xdf.interpretation$expression=="cer","certainly",
                                     ifelse(xdf.interpretation$expression=="cerNot","certainlyNot",
                                            ifelse(xdf.interpretation$expression=="poss","possibly",
                                                   ifelse(xdf.interpretation$expression=="prob","probably","probablyNot"))))

# get rid of some columns
xdf.interpretation$comments<-xdf.interpretation$engagement<-xdf.interpretation$difficulty<-xdf.interpretation$language<-NULL
# add a value column, representing pairs <a,o> as a*10+0 (only exception is pair <10,10> represented as 1010)
xdf.interpretation$value=ifelse(xdf.interpretation$kind=="f",NA, #it makes sense only in guess-the-observation trials
                                ifelse(xdf.interpretation$access==10&xdf.interpretation$observation==10,1010,#takes care of exceptioncal case
                                       10*xdf.interpretation$access+xdf.interpretation$observation))
# save (to be used in analysis.r)
write.csv(xdf.interpretation,"clean_interpretation_data.csv", row.names = FALSE)

# visualize guess-the-state data (trials of kind "f"): discrete distributions over states
df.s=as.data.frame(xtabs(~expression+state,data=droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="f"))))
# states as factor, it's really a categorical variable
df.s$state=as.factor(df.s$state)
colnames(df.s)=c("expression","state","count")
#plot
max=max(df.s$count)
state.lines=ggplot(data=df.s)+geom_point(aes(x=state,y=count,group=expression),size=2.5)+geom_line(aes(x=state,y=count,group=expression))+facet_wrap(facets=~expression,ncol=5)+ scale_y_continuous(limits = c(0,max), breaks=seq(0,max,15))+theme_bw() +theme(strip.background = element_blank(),text=element_text( size=24), legend.position="bottom")
show(state.lines)

# visualize marginalized distributions over access and observation
# access
df.a=as.data.frame(xtabs(~expression+access,data=droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))))
# accesss as factor, it's really a categorical variable
df.a$access=as.factor(df.a$access)
colnames(df.a)=c("expression","access","count")
# plot
access.lines=ggplot(data=df.a)+geom_point(aes(x=access,y=count,group=expression),size=2.5)+geom_line(aes(x=access,y=count,group=expression))+facet_wrap(facets=~expression,ncol=5)+ scale_y_continuous(limits = c(0,70), breaks=seq(0,70,10))+theme_bw() +theme(strip.background = element_blank(),text=element_text( size=24), legend.position="bottom")
# observation
df.o=as.data.frame(xtabs(~expression+observation,data=droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))))
# observations as factor, it's really a categorical variable
df.o$observation=as.factor(df.o$observation)
colnames(df.o)=c("expression","observation","count")
# plot
observation.lines=ggplot(data=df.o)+geom_point(aes(x=observation,y=count,group=expression),size=2.5)+geom_line(aes(x=observation,y=count,group=expression))+facet_wrap(facets=~expression,ncol=5)+ scale_y_continuous(limits = c(0,70), breaks=seq(0,70,10))+theme_bw() +theme(strip.background = element_blank(),text=element_text( size=24), legend.position="bottom")
# show plots together
show(grid.arrange(access.lines,observation.lines, ncol = 2))


## compute bootstrapped 95% CIs for interpretation data
# state
states <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="f"))$state)) 
expressions <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="f"))$expression))  # experimental conditions
repetitions <- 1000 # how many samples?

# output is array expressions x state x repetitions, output1 is values x expressions x 3 (ci.low, mean, ci.high)
output <- array(dim=c(length(expressions),length(states),repetitions),dimnames = list(expressions,states,c(1:repetitions)))
output1 <- array(dim=c(length(expressions),length(states),3),dimnames = list(expressions,states,c("ci.low","mean","ci.high")))
for (e in 1:length(expressions)){ # for each condition...
  choices <- subset(subset(xdf.interpretation,xdf.interpretation$kind=="f"), subset(xdf.interpretation,xdf.interpretation$kind=="f")$expression==expressions[e])$state # get the vector with observed answers
  for (s in 1:length(states)){
    output[e,s,] <- bootstrap(x=choices,nboot=repetitions,theta = count,states[s])$thetastar
    output1[e,s,] <- c(ci.low(output[e,s,]),mean(output[e,s,]),ci.high(output[e,s,]))
  }
}
# as df
df.s.cis <- as.data.frame(cbind(melt(output1[,,1]),melt(output1[,,2])$value,melt(output1[,,3])$value))
colnames(df.s.cis) <- c("expression","state","ci.low","mean","ci.high")
# save
write.csv(df.s.cis,"simple_interpretation_state_cis.csv", row.names = FALSE)


# access
accesses <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))$access)) 
expressions <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))$expression))  # experimental conditions
repetitions <- 1000 # how many samples?

# output is array expressions x access x repetitions, output1 is values x expressions x 3 (ci.low, mean, ci.high)
output <- array(dim=c(length(expressions),length(accesses),repetitions),dimnames = list(expressions,accesses,c(1:repetitions)))
output1 <- array(dim=c(length(expressions),length(accesses),3),dimnames = list(expressions,accesses,c("ci.low","mean","ci.high")))
for (e in 1:length(expressions)){ # for each condition...
  choices <- subset(subset(xdf.interpretation,xdf.interpretation$kind=="c"), subset(xdf.interpretation,xdf.interpretation$kind=="c")$expression==expressions[e])$access # get the vector with observed answers
  for (a in 1:length(accesses)){
    output[e,a,] <- bootstrap(x=choices,nboot=repetitions,theta = count,accesses[a])$thetastar
    output1[e,a,] <- c(ci.low(output[e,a,]),mean(output[e,a,]),ci.high(output[e,a,]))
  }
}
# as df
df.a.cis <- as.data.frame(cbind(melt(output1[,,1]),melt(output1[,,2])$value,melt(output1[,,3])$value))
colnames(df.a.cis) <- c("expression","access","ci.low","mean","ci.high")
# save
write.csv(df.a.cis,"simple_interpretation_access_cis.csv", row.names = FALSE)


# observation
observs <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))$observation)) 
expressions <- levels(as.factor(droplevels(subset(xdf.interpretation,xdf.interpretation$kind=="c"))$expression))  # experimental conditions
repetitions <- 1000 # how many samples?

# output is array expressions x access x repetitions, output1 is values x expressions x 3 (ci.low, mean, ci.high)
output <- array(dim=c(length(expressions),length(observs),repetitions),dimnames = list(expressions,observs,c(1:repetitions)))
output1 <- array(dim=c(length(expressions),length(observs),3),dimnames = list(expressions,observs,c("ci.low","mean","ci.high")))
for (e in 1:length(expressions)){ # for each condition...
  choices <- subset(subset(xdf.interpretation,xdf.interpretation$kind=="c"), subset(xdf.interpretation,xdf.interpretation$kind=="c")$expression==expressions[e])$observation # get the vector with observed answers
  for (o in 1:length(observs)){
    output[e,o,] <- bootstrap(x=choices,nboot=repetitions,theta = count,observs[o])$thetastar
    output1[e,o,] <- c(ci.low(output[e,o,]),mean(output[e,o,]),ci.high(output[e,o,]))
  }
}
# as df
df.o.cis <- as.data.frame(cbind(melt(output1[,,1]),melt(output1[,,2])$value,melt(output1[,,3])$value))
colnames(df.o.cis) <- c("expression","observation","ci.low","mean","ci.high")
# save
write.csv(df.o.cis,"simple_interpretation_observation_cis.csv", row.names = FALSE)


## Bayesian statistics
# linear (?) bayesian regression on metric state, then observation, then access

# state
tempdata <- xdf.interpretation %>% filter(kind=="f")
tempdata <- mutate(tempdata, expression=factor(expression, levels = c("certainlyNot","probablyNot","possibly","probably","certainly")))

# first model: participants' answer about state given received message
nb0 <- brm(formula = state ~ expression, data = tempdata)
summary(nb0)
# get posterior
qs0 = posterior_samples(nb0) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
qs0_summary = qs0 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
qs0_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(nb0), regex_pars = "b_")


# observaion
tempdata <- xdf.interpretation %>% filter(kind=="c")
tempdata <- mutate(tempdata, expression=factor(expression, levels = c("certainlyNot","probablyNot","possibly","probably","certainly")))
# second model: participants' answer about observation given received message
nb1 <- brm(formula = observation ~ expression, data = tempdata)
summary(nb1)
# get posterior
qs1 = posterior_samples(nb1) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
qs1_summary = qs1 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
qs1_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(nb1), regex_pars = "b_")


# access
# same data as observation
# thirs model: participants' answer about access given received message
nb2 <- brm(formula = access ~ expression, data = tempdata)
summary(nb2)
# get posterior
qs2 = posterior_samples(nb2) %>% 
  gather(key = "variable", value = "value") %>% as_tibble
# group by variables of interest and compute posterior means and hdis of coefficients
qs2_summary = qs2 %>% group_by(variable) %>% 
  summarize(HDI_lo = coda::HPDinterval(coda::as.mcmc(value))[1],
            mean = mean(value),
            HDI_hi = coda::HPDinterval(coda::as.mcmc(value))[2]) %>% 
  ungroup() %>% 
  mutate(credibly_different = ifelse(HDI_lo > 0, "bigger", ifelse(HDI_hi < 0, "smaller", "--"))) # label coefficients credibly different than 0
# show tibble
qs2_summary
# plot coefficients
bayesplot::color_scheme_set("red")
bayesplot::mcmc_intervals(as.array(nb2), regex_pars = "b_")
