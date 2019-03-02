### Unified Bayesian data analysis for the complex expression experiments and RSA model evaluation
### we train a JAGS implementation of the pragmatic model on the experimental data
### we compute model predictions for each inferred value of the parameters
### we compute correlation scores and visualize posterior predictive checks
### finally, we compare data from the 'beliefs-about-the-urn' experiment with predictions of the trained model

## libraries, sources, data
# manipulation
library(dplyr)
library(reshape2)
# visualization
library(ggplot2)
library(grid)
library(gridExtra)
# simulation and analysis
library(VGAM) # dbetabinom.ab distribution is here
library(R2jags) # to have R and JAGs talk to each other
library(tidyverse)

# source functions
source("useful_functions.r") # various useful definitions
source("prediction_functions.r") # the prediction functions, ie R implementation of the model 

# get data
df.production=read.csv("clean_production_data.csv") # output of processing raw data from the production task
df.interpretation=read.csv("clean_interpretation_data.csv") # output of processing raw data from the insterpretation task
df.e.cis <- read.csv("complex_production_cis.csv") # output of bootstrapping 95% cis from production data
df.s.cis <- read.csv("complex_interpretation_state_cis.csv") # output of bootstrapping 95% cis from interpr. data
df.a.cis <- read.csv("complex_interpretation_access_cis.csv") # output of bootstrapping 95% cis from interpr. data
df.o.cis <- read.csv("complex_interpretation_observation_cis.csv") # output of bootstrapping 95% cis from interpr. data
df.observed.beliefs=read.csv("observed_belief.csv") # output of processing raw data from the 'beliefs about the urn' experiment

## basic set up of the model
n=10 # balls in the urn
states=c(0:n) # state space, ie the possible numbers of red balls in the urn
# full set of possible values, ie natural numers coding <a,o> pairs, eg <8,3> coded as 83
# generated calling function from useful_function.r
V=valuesF()$pairValues
A=valuesF()$accessValues
O=valuesF()$observationValues
access=unique(A)
observation=unique(O)

# values used in the production exp, ie experimental conditions
A.prod=c(2,2,4,4,4,8,8,8,8,8,10,10,10,10,10) # access
O.prod=c(0,2,1,2,3,0,2,4,6,8,2,3,5,7,8) # observation
V.prod=A.prod*10+O.prod # pairs <a,o>
access.prod = unique(A.prod)
observation.prod = unique(O.prod)
prod.values.indices=which(V %in% V.prod) # needed in the jags model , when conditioning on experimental data

# values observed in the interpretation exp
V.inter=df.interpretation %>% 
  filter(kind=="c") %>% 
  select(value) %>% unique() %>% 
  arrange(value) 
V.inter=V.inter$value
# corresponding A and O vectors
A.inter=ifelse(V.inter==1010,10,trunc(V.inter/10))
O.inter=ifelse(V.inter==1010,10,V.inter-(A.inter*10)) 
access.inter=unique(A.inter)
observation.inter=unique(O.inter)
inter.values.indices=which(V %in% V.inter) # needed in the jags model , when conditioning on experimental data
# notice: observed values coincides with the set of all possible values

# messages
nesting=c("is_certainly","is_probably","might_be")
simple=c("likely","possible","unlikely")
TMPcomplex=matrix(nrow=length(nesting),ncol=length(simple))
for (m1 in 1:length(nesting)){
  for (m2 in 1:length(simple)){
    TMPcomplex[m1,m2]=paste(nesting[m1],simple[m2])
  }
}
complex=as.vector(t(TMPcomplex))
messages=c(paste("is",simple),complex)


## JAGS code to infer samples for the free parameters of the model
# modules
load.module("bugs")  # binomial distrib is def'd here
load.module("mix") # betabinomial distrib is def'd here

# data (in a wide sense, includes actual experimental data but also min and max values for parameters etc)
th.min=0 # min value for thetas, ie semantic thresholds
th.max=1 # max value for thetas
al.max=20 # max value for alpha, shape parameter of betabinomial distribution modeling prior belief over state space
la.max=20 # max value for lambda, rationality par

# experimental data: production study
# matrix of expressions (answer.full) counts observed in each experimental condition (values)
levels(df.production$answer.full)==messages # check whether names and order are the same for data and model
levels(as.factor(df.production$value))==V.prod
# counts 
D.prod=t(xtabs(~answer.full+value,df.production))
# how many observations for each value condition?
Tr.prod=c()

for (i in 1:length(V.prod)){
  Tr.prod[i]=sum(D.prod[i,])
}

# experimental data: interpretation study
# first, guess-the-observation trials (kind c)
# matrix of value counts observed in each experimental condition (expressions)
levels(df.interpretation$expression)==messages # check whether names and order are the same for data and model
# counts of values
D.inter.value=t(xtabs(~value+expression,subset(df.interpretation,df.interpretation$kind=="c")))
# how many observations for each expression conditions? (it should be perfeclty balanced already)
Tr.inter.value=c()
for (i in 1:length(messages)){
  Tr.inter.value[i]=sum(D.inter.value[i,])
}
#Tr.inter.value
#[1] 150 150 150 150 150 150 150 150 150 150 150 150 --> it is.

# second, guess-the-state trials (kind f)
# matrix of state counts observed in each experimental condition (expressions)
# counts of state
D.inter.state=t(xtabs(~state+expression,subset(df.interpretation,df.interpretation$kind=="f")))
# how many observations for each expression conditions? (it should be perfeclty balanced already)
Tr.inter.state=c()
for (i in 1:length(messages)){
  Tr.inter.state[i]=sum(D.inter.state[i,])
}
#Tr.inter.value==Tr.inter.state
#[1] TRUE TRUE TRUE TRUE TRUE TRUE TRUE TRUE TRUE TRUE TRUE TRUE --> ok.

# list of data to be passed to JAGS
dataList = list(n=n,#basic stuff, values etc
                states=states,
                acc=A,
                obs=O,
                values=V,
                prod.values=V.prod,
                prod.values.indices=prod.values.indices,
                inter.values=V.inter,
                inter.values.indices=inter.values.indices,
                theta.min=th.min, #min and max values for parameters
                theta.max=th.max,
                alpha.max=al.max,
                lambda.max=la.max,
                simple=simple, #messages
                complex=complex,
                messages=messages,
                production.trials=Tr.prod, #experimental data
                interpretation.trials=Tr.inter.value,
                countdata.expression=D.prod,
                countdata.value=D.inter.value,
                countdata.state=D.inter.state
)

# variables to monitor during the walk
parameters=c("alpha",
             "alpha_ax",
             "beta",
             "beta_ax",
             "kappa",
             "kappa_ax",
             "omega",
             "omega_ax",
             "lambda",
             "theta.might",
             "theta.probably",
             "theta.certainly",
             'PPC.expression',
             'PPC.state',
             'PPC.value',
             'speaker.prob',
             'listener.prob.state',
             'listener.prob.value'
             )

# jags model
model="jags_model_predictive.R"

# # command to get samples
j.samples=jags(data=dataList,
               parameters.to.save = parameters,
               model.file = model,
               n.chains=1, n.iter=5, # how many chain, how many iterations?
               n.burnin=1, n.thin=1, DIC=F) # burn in, thinning values, compute DIC
# 
# # visualize summary about parameter
# j.samples


# speaker.pob = j.samples$BUGSoutput$sims.list$speaker.prob[1,,] %>% melt() %>% 
#   rename(OA = Var1, expression = Var2, probability = value) %>% 
#   mutate(message = messages[expression],
#          value = V.inter[OA]) %>% 
#   filter(value == 63) %>% arrange(-probability)




######################
### expression
######################

messgLevels = c("is likely","is possible", "is unlikely", 
                "is certainly likely", "is certainly possible", "is certainly unlikely", 
                "is probably likely", "is probably possible", "is probably unlikely", 
                "might be likely", "might be possible", "might be unlikely")[c(6,3,9,12,11,8,2,5,10,7,1,4)]

access = ifelse(V.prod==1010,10,trunc(V.prod/10))
observation = ifelse(V.prod==1010,10,V.prod-10*trunc(V.prod/10))
conditionLevels = paste0(observation, " red out of ", access)[c(1,3,4,5,2,6,7,8,9,10,11,12,13,14,15)]

PPC.expression = j.samples$BUGSoutput$sims.list$PPC.expression[,,] %>% melt() %>% as.tibble() %>% 
  rename(iter = Var1, OA = Var2, expression = Var3, counts = value) %>% 
  mutate(message = factor(str_replace(messages[expression], "_", " "), 
                          ordered = T, levels = messgLevels),
         value = V.prod[OA],
         access = ifelse(value==1010,10,trunc(value/10)),
         observation = ifelse(value==1010,10,value-10*trunc(value/10)),
         condition = factor(paste0(observation, " red out of ", access), ordered = T, levels = conditionLevels)) %>% 
  select(iter, condition, message, counts) %>% 
  group_by(iter,condition) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  group_by(condition, message) %>% 
  summarize(mean_count = mean(counts) / N[1] * 100,
            lower = HDIofMCMC(counts)[1] / N[1] * 100,
            upper = HDIofMCMC(counts)[2] / N[1] * 100)

PPC.expression %>% group_by(condition) %>% summarize(total = sum(mean_count))

max <- max(PPC.expression$upper)
PPC.expression.plot = ggplot(PPC.expression, aes(x = message, y = mean_count, fill = message)) + 
  geom_bar(stat = "identity") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  facet_wrap(~condition, ncol = 5) +
  ylab("choice %") + 
  scale_y_continuous(limits = c(0,max), breaks=seq(0,max,20)) +
  coord_flip()+
  xlab("expression") +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="none",panel.spacing.x=unit(1, "lines"))
ggsave(filename = "pics/PPC.expression.plot.pdf", plot = PPC.expression.plot, height = 10, width = 20)


######################
### state
######################

messgLevelsShort = c("likely","possible", "unlikely", 
                     "certainly lik.", "certainly poss.", "certainly unlik.", 
                     "probably lik.", "probably poss.", "probably unlik.", 
                     "might be lik.", "might be poss.", "might be unlik.")

PPC.state = j.samples$BUGSoutput$sims.list$PPC.state[,,] %>% melt() %>% 
  as.tibble() %>% 
  rename(iter = Var1, state = Var3, expression = Var2, counts = value) %>% 
  mutate(message = factor(messgLevelsShort[expression], 
                          ordered = T, levels = messgLevelsShort)) %>%  
  select(iter, message, state, counts) %>% 
  group_by(iter, message) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  group_by(message, state) %>% 
  summarize(mean_count = mean(counts) / N[1] * 100,
            lower = HDIofMCMC(counts)[1] / N[1] * 100,
            upper = HDIofMCMC(counts)[2] / N[1] * 100)


# plot
PPC.state.plot = ggplot(PPC.state, aes(y = mean_count, x = state)) + 
  geom_bar(stat="identity", fill = "firebrick") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())


######################
### value
######################  

PPC.value = j.samples$BUGSoutput$sims.list$PPC.value[,,] %>% melt() %>% 
  as.tibble() %>% 
  rename(iter = Var1, OA = Var3, expression = Var2, counts = value) %>% 
  mutate(message = factor(messgLevelsShort[expression], 
                          ordered = T, levels = messgLevelsShort),
         value = V.inter[OA],
         access = ifelse(value==1010,10,trunc(value/10)),
         observation = ifelse(value==1010,10,value-10*trunc(value/10))) %>% 
  select(iter, message, value, access, observation, counts) 
  
######################
### access
###################### 
  
PPC.access = PPC.value %>% 
  group_by(iter,message,access) %>% 
  summarize(counts = sum(counts)) %>% 
  group_by(iter, message) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  group_by(message,access) %>% 
  summarize(mean_count = mean(counts) / N[1] * 100,
            lower = HDIofMCMC(counts)[1] / N[1] * 100,
            upper = HDIofMCMC(counts)[2] / N[1]* 100)

# plot
PPC.access.plot = ggplot(PPC.access, aes(y = mean_count, x = access)) + 
  geom_bar(stat="identity", fill = "forestgreen") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())


######################
### observation
###################### 

PPC.observation = PPC.value %>% group_by(iter,message,observation) %>% 
  summarize(counts = sum(counts)) %>% 
  group_by(iter, message) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  group_by(message,observation) %>% 
  summarize(mean_count = mean(counts) / N[1] * 100,
            lower = HDIofMCMC(counts)[1] / N[1] * 100,
            upper = HDIofMCMC(counts)[2] / N[1] * 100)

# plot
PPC.observation.plot = ggplot(PPC.observation, aes(y = mean_count, x = observation)) + 
  geom_bar(stat="identity", fill = "dodgerblue4") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())


############################################
### joining interpretation plots
############################################

pdf("pics/PPC.interpretation.plot.pdf", width = 20, height = 10)
grid.arrange(PPC.state.plot,
                             PPC.access.plot,
                             PPC.observation.plot, 
                             ncol = 3, 
                             left=textGrob("predicted counts", gp=gpar(fontsize=25), rot = 90, just = "centre")) 
dev.off()


stop()

# extract samples for each parameter of interest
alpha=j.samples$BUGSoutput$sims.list$alpha
alpha_ax=j.samples$BUGSoutput$sims.list$alpha_ax
beta=j.samples$BUGSoutput$sims.list$beta
beta_ax=j.samples$BUGSoutput$sims.list$beta_ax
kappa=j.samples$BUGSoutput$sims.list$kappa
kappa_ax=j.samples$BUGSoutput$sims.list$kappa_ax
omega=j.samples$BUGSoutput$sims.list$omega
omega_ax=j.samples$BUGSoutput$sims.list$omega_ax
lambda=j.samples$BUGSoutput$sims.list$lambda

theta.might=j.samples$BUGSoutput$sims.list$theta.might
theta.probably=j.samples$BUGSoutput$sims.list$theta.probably
theta.certainly=j.samples$BUGSoutput$sims.list$theta.certainly

# save parameters as data frame so that we don't need to run jags every time
df.samples=as.data.frame(cbind(alpha,alpha_ax,beta,beta_ax,lambda,theta.might,theta.probably,theta.certainly))
colnames(df.samples)=c("alpha","alpha_ax","beta","beta_ax","lambda","theta.might","theta.probably","theta.certainly")

samples = df.samples

# write.csv(df.samples,"df_samples.csv",row.names = FALSE)
# 
# 
# # once the df is saved, we can start from here:
# samples=read.csv("df_samples.csv")

# summarize parameters
mean(samples$alpha)
HDIofMCMC(samples$alpha)
mean(samples$alpha_ax)
HDIofMCMC(samples$alpha_ax)
mean(samples$beta)
HDIofMCMC(samples$beta)
mean(samples$beta_ax)
HDIofMCMC(samples$beta_ax)

mean(samples$lambda)
HDIofMCMC(samples$lambda)

mean(samples$theta.might)
HDIofMCMC(samples$theta.might)
mean(samples$theta.probably)
HDIofMCMC(samples$theta.probably)
mean(samples$theta.certainly)
HDIofMCMC(samples$theta.certainly)


# "cheat" and make it quicker for debugging 
# samples=samples[sample(nrow(samples), 500), ]

## Generate model predictions: for each row of the JAGS output we run our prediction functions instantiating the parameters to the estimated values
# init arrays to fill with predictions and bayesian posterior predcitive (fake simulated data)
# speaker
speaker.predictions=array(dim = c(length(samples[,1]),length(V.prod),length(messages)), dimnames = list(c(1:length(samples[,1])),V.prod,messages))
speaker.fake.data=array(dim = c(length(samples[,1]),length(V.prod),length(messages)), dimnames = list(c(1:length(samples[,1])),V.prod,messages))
# inferred rational beliefs about the urn (we compare them with experimentally estimated beliefs)
beliefs.predictions=array(dim = c(length(samples[,1]),length(V),length(states)), dimnames = list(c(1:length(samples[,1])),V,states))
beliefs.fake.data=array(dim = c(length(samples[,1]),length(V),length(states)), dimnames = list(c(1:length(samples[,1])),V,states))
# listener
listener.state.predictions=array(dim = c(length(samples[,1]),length(messages),length(states)), dimnames = list(c(1:length(samples[,1])),messages,states))
listener.state.fake.data=array(dim = c(length(samples[,1]),length(messages),length(states)), dimnames = list(c(1:length(samples[,1])),messages,states))
listener.value.predictions=array(dim = c(length(samples[,1]),length(messages),length(V.inter)), dimnames = list(c(1:length(samples[,1])),messages,V.inter))
listener.value.fake.data=array(dim = c(length(samples[,1]),length(messages),length(V.inter)), dimnames = list(c(1:length(samples[,1])),messages,V.inter))
# listener marginalized
listener.access.predictions=array(dim = c(length(samples[,1]),length(messages),length(access.inter)), dimnames = list(c(1:length(samples[,1])),messages,access.inter))
listener.access.fake.data=array(dim = c(length(samples[,1]),length(messages),length(access.inter)), dimnames = list(c(1:length(samples[,1])),messages,access.inter))
listener.observation.predictions=array(dim = c(length(samples[,1]),length(messages),length(observation.inter)), dimnames = list(c(1:length(samples[,1])),messages,observation.inter))
listener.observation.fake.data=array(dim = c(length(samples[,1]),length(messages),length(observation.inter)), dimnames = list(c(1:length(samples[,1])),messages,observation.inter))

# outer for loop, iterate for each row of the jags output
# init progress bar
pb = txtProgressBar(min = 0, max = length(samples[,1]), initial = 0) 

for (i in 1:length(samples[,1])){
  setTxtProgressBar(pb,i)
  
  # extract the i-th value for the parameters
  alpha=samples$alpha[i]
  alpha_ax=samples$alpha_ax[i]
  beta=samples$beta[i]
  beta_ax=samples$beta_ax[i]
  lambda=samples$lambda[i]
  theta.might=samples$theta.might[i]
  theta.probably=samples$theta.probably[i]
  theta.certainly=samples$theta.certainly[i]
  
  # generate predictions
  # speaker
  df.speaker.pred=predictions.sp(alpha,alpha_ax, beta, beta_ax,lambda,theta.might,theta.probably,theta.certainly)$speaker
  # listener
  df.lis.state.pred=predictions.li(alpha,alpha_ax,beta,beta_ax,lambda,theta.might,theta.probably,theta.certainly)$listener.state
  df.lis.value.pred=predictions.li(alpha,alpha_ax,beta,beta_ax,lambda,theta.might,theta.probably,theta.certainly)$listener.value
  # add access and observation columns, useful below
  df.lis.value.pred$access=ifelse(df.lis.value.pred$value==1010,10,trunc(df.lis.value.pred$value/10))
  df.lis.value.pred$observation=ifelse(df.lis.value.pred$value==1010,10,df.lis.value.pred$value-10*trunc(df.lis.value.pred$value/10))
  # beliefs
  df.bel.pred=predictions.li(alpha,alpha_ax,beta,beta_ax,lambda,theta.might,theta.probably,theta.certainly)$beliefs
  
  # inner loop: fill speaker.predictions (probability) and speaker.fake.data (bayesian posterior predictive)
  for (v in 1:length(V.prod)){
    for (m in 1:length(messages)){
      speaker.predictions[i,v,m]=(subset(df.speaker.pred, df.speaker.pred$value==V.prod[v]&df.speaker.pred$answer==messages[m]))$probability
    }
    # fake data are sampled from multinomial distribution with weights given by the predicted probabilities
    speaker.fake.data[i,v,]=rmultinom(n=1,size=Tr.prod[v],prob=speaker.predictions[1,v,])
  }
  
  # inner loop: fill beliefs.predictions
  for (v in 1:length(V)){
    for (s in 1:length(states)){
      beliefs.predictions[i,v,s]=(subset(df.bel.pred, df.bel.pred$value==V[v]&df.bel.pred$state==states[s]))$probability
    }
    beliefs.fake.data[i,v,]=rmultinom(n=1,size=100,prob=beliefs.predictions[1,v,]) # size of 100, we generate fake data as %
  }

  # inner loop: fill listener.state.predictions and fake data
  for (m in 1:length(messages)){
    for (s in 1:length(states)){
      listener.state.predictions[i,m,s]=(subset(df.lis.state.pred, df.lis.state.pred$message==messages[m]&df.lis.state.pred$state==states[s]))$probability
    }
    listener.state.fake.data[i,m,]=rmultinom(n=1,size=Tr.inter.state[m],prob=listener.state.predictions[1,m,])
  }

  # inner loop: fill listener.value.predictions and fake data
  for (m in 1:length(messages)){
    for (v in 1:length(V.inter)){
      listener.value.predictions[i,m,v]=(subset(df.lis.value.pred, df.lis.value.pred$message==messages[m]&df.lis.value.pred$value==V.inter[v]))$probability
    }
    listener.value.fake.data[i,m,]=rmultinom(n=1,size=Tr.inter.value[m],prob=listener.value.predictions[1,m,])
  }

  # inner loop: fill listener.access.predictions and fake data
  for (m in 1:length(messages)){
    for (a in 1:length(access.inter)){
      listener.access.predictions[i,m,a]=sum(subset(df.lis.value.pred, df.lis.value.pred$message==messages[m]&df.lis.value.pred$access==access.inter[a])$probability)
    }
    listener.access.fake.data[i,m,]=rmultinom(n=1,size=Tr.inter.value[m],prob=listener.access.predictions[1,m,])
  }
  
  # inner loop: fill listener.observation.predictions and fake data
  for (m in 1:length(messages)){
    for (o in 1:length(observation.inter)){
      listener.observation.predictions[i,m,o]=sum((subset(df.lis.value.pred, df.lis.value.pred$message==messages[m]&df.lis.value.pred$observation==observation.inter[o]))$probability)
    }
    listener.observation.fake.data[i,m,]=rmultinom(n=1,size=Tr.inter.state[m],prob=listener.observation.predictions[1,m,])
  }
}



## Correlation scores, visualization, posterior predictive checks

## PRODUCTION

# first, production: data frame with observed counts of expressions (answer.full) ad predicted counts (probabilities*#observations) given value condition,
df.e=as.data.frame(melt(xtabs(~answer.full+value,df.production)))
colnames(df.e)=c("expression","value","data")
# speaker predictions as counts, ie multiplied by #of observation per condition
speaker.predicted.counts=speaker.predictions
for (v in 1:length(V.prod)){
  speaker.predicted.counts[,v,]=speaker.predictions[,v,]*Tr.prod[v]
}

# # we correlate each of the posterior predictive distributions with the observed counts, obtain a vector of Pearson's correlation coefficients
pearson.correlation.coeff1=c()
for (i in 1:length(samples[,1])){
  # one df for each sample vector
  df.sp.predicted.counts1=as.data.frame(melt(speaker.fake.data[i,,]))
  colnames(df.sp.predicted.counts1)=c("value","expression","prediction")
  # rearrange by value, so that it matches the order in df.e
  df.sp.predicted.counts1=arrange(df.sp.predicted.counts1,value)
  # one corr coeff for each sample vector
  pearson.correlation.coeff1[i]=cor.test(x=df.e$data,y=df.sp.predicted.counts1$prediction,method="pearson",exact=FALSE)$estimate
}
# plot density of corr. coeff. together with summary (mean and hdis)
plot(density(pearson.correlation.coeff1), xlim=c(0,1), xlab="Pearson cor", sub=("simple expressions choice") ,main=paste("mean=",round(mean(pearson.correlation.coeff1),3),"HDI=",round(HDIofMCMC(pearson.correlation.coeff1)[1],3),"-",round(HDIofMCMC(pearson.correlation.coeff1)[2],3)))


# now we plot data as bars (%) together with posterior predictive checks
# ppcs: mean fake data and hdis
speaker.mean.fake=matrix(nrow=length(messages),ncol=length(V.prod))
speaker.low.hdis=matrix(nrow=length(messages),ncol=length(V.prod))
speaker.high.hdis=matrix(nrow=length(messages),ncol=length(V.prod))
for (m in 1:length(messages)){
  for (v in 1:length(V.prod)){
    speaker.mean.fake[m,v]=mean(speaker.fake.data[,v,m])
    speaker.low.hdis[m,v]=HDIofMCMC(speaker.fake.data[,v,m])[1]
    speaker.high.hdis[m,v]=HDIofMCMC(speaker.fake.data[,v,m])[2]
  }
}
row.names(speaker.mean.fake)=row.names(speaker.low.hdis)=row.names(speaker.high.hdis)=messages  
colnames(speaker.mean.fake)=colnames(speaker.low.hdis)=colnames(speaker.high.hdis)=V.prod
# add columns (to be converted into percentages later)
df.e$fake_data=as.data.frame(melt(speaker.mean.fake))$value
df.e$low.hdi=as.data.frame(melt(speaker.low.hdis))$value
df.e$high.hdi=as.data.frame(melt(speaker.high.hdis))$value
# everything to percentages
for (i in 1:length(df.e[,1])){
  df.e$data_percentage[i]=(100/Tr.prod[which(V.prod==df.e$value[i])])*df.e$data[i]
  df.e$fake_data_percentage[i]=(100/Tr.prod[which(V.prod==df.e$value[i])])*df.e$fake_data[i]
  df.e$low.hdi_percentage[i]=(100/Tr.prod[which(V.prod==df.e$value[i])])*df.e$low.hdi[i]
  df.e$high.hdi_percentage[i]=(100/Tr.prod[which(V.prod==df.e$value[i])])*df.e$high.hdi[i]
}
# add some columns to df for easier visualization
df.e$access=trunc(df.e$value/10)
df.e$observation=df.e$value-10*df.e$access
# better looking labels for values
df.e$label=as.factor(paste0(df.e$observation," red balls out of ",df.e$access))
# change order to make plot more readable
df.e$label = factor(df.e$label,levels(df.e$label)[c(1,3,6,9,5,2,7,10,12,15,4,8,11,13,14)])
# better looking names
levels(df.e$expression)=c("is likely","is possible", "is unlikely", "is certainly likely", "is certainly possible", "is certainly unlikely", "is probably likely", "is probably possible", "is probably unlikely", "might be likely", "might be possible", "might be unlikely")
# change order to make plot more readable
df.e$expression = factor(df.e$expression,levels(df.e$expression)[c(6,3,9,12,11,8,2,5,10,7,1,4)])

# add cis to observed data
levels(df.e.cis$message)=c("is likely","is possible", "is unlikely", "is certainly likely", "is certainly possible", "is certainly unlikely", "is probably likely", "is probably possible", "is probably unlikely", "might be likely", "might be possible", "might be unlikely")
df.e.cis$message = factor(df.e.cis$message,levels(df.e.cis$message)[c(6,3,9,12,11,8,2,5,10,7,1,4)])
df.e.cis <- arrange(df.e.cis,value)
df.e$ci.low <- df.e.cis$ci.low
df.e$mean <- df.e.cis$mean
df.e$ci.high <- df.e.cis$ci.high

# plots with cis
max <- max(df.e$mean+df.e$ci.high)
expression.bars.ci=ggplot(data=df.e)+
  geom_bar(aes(x=expression,y=data_percentage,fill=expression),stat="identity")+
  # geom_ribbon(aes(x=expression, ymin=mean-ci.low, ymax=mean+ci.high, group=label), fill="firebrick", alpha="0.5")+
  geom_point(aes(x=expression,y=mean, group=label),color="black",size=1.5)+
  geom_errorbar(aes(x=expression,ymin=mean-ci.low, ymax=mean+ci.high, group=label), colour="black", width=0.5)+
  ylab("choice %")+ scale_y_continuous(limits = c(0,max), breaks=seq(0,max,20))+coord_flip()+
  facet_wrap(facets = ~label, ncol=5)+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="none",panel.spacing.x=unit(1, "lines"))
show(expression.bars.ci)

# prediction vs data, w bootstrapped cis and hdis
# add columns with modifier and nested expression, maybe useful in legend
df.e$modifier <- ifelse(df.e$expression %in% paste("is",simple),"none",ifelse(sub(" .*", "", df.e$expression)=="might","might",sub(".*  *(.*?) * .*", "\\1", df.e$expression)))
df.e$nested <- sub('^.* ([[:alnum:]]+)$', '\\1', df.e$expression)
# plot
expression.vs.ppc.ci=ggplot(data=df.e)+
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=low.hdi_percentage, xmax=high.hdi_percentage, ymin=mean-ci.low, ymax=mean+ci.high, fill=nested), alpha=0.25) +
  geom_errorbar(aes(x=fake_data_percentage,ymin=mean-ci.low, ymax=mean+ci.high, group=label), colour="black")+
  geom_errorbarh(aes(x=fake_data_percentage,y=data_percentage,xmin=low.hdi_percentage, xmax=high.hdi_percentage, group=label), colour="black")+
  geom_point(size=4, aes(x=fake_data_percentage,y=data_percentage,fill=nested,shape=modifier))+
  scale_shape_manual(values=c(21,22,23,24))+
  facet_wrap(facets = ~label, ncol=5)+
  xlab("prediction")+
  ylab("data")+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="bottom")
  # guides(shape=guide_legend(title="modifier", nrow = 1), fill=guide_legend(title="nested", nrow=1))
show(expression.vs.ppc.ci)

# prediction only, as bars, with hdis
#max <- max(df.e$fake_data_percentage + df.e$high.hdi_percentage)
expression.bars.hdi=ggplot(data=df.e)+
  geom_bar(aes(x=expression,y=fake_data_percentage,fill=expression),stat="identity")+
  geom_point(aes(x=expression,y=fake_data_percentage, group=label),color="black",size=1.5)+
  geom_errorbar(aes(x=expression,ymin=low.hdi_percentage, ymax=high.hdi_percentage, group=label),
                colour="black",
                width=0.5)+
  ylab("predicted %")+ scale_y_continuous(limits = c(0,max), breaks=seq(0,max,20))+coord_flip()+
  facet_wrap(facets = ~label, ncol=5)+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="none",panel.spacing.x=unit(1, "lines"))
show(expression.bars.hdi)


### INTERPRETATIOnN

# first of all split df.interpretation in data from guess-the-state and guess-the-observation trials, ie along the kind dimension
df.interpretation.state=droplevels(subset(df.interpretation,df.interpretation$kind=="f"))
df.interpretation.value=droplevels(subset(df.interpretation,df.interpretation$kind=="c"))

# inference of STATE: data frame with observed counts of state choices and predicted counts (probabilities*#observations) given expression condition,
# counts of state choices
df.s=as.data.frame(melt(xtabs(~state+expression,df.interpretation.state)))
colnames(df.s)=c("state","expression","data")
# speaker predictions as counts, ie multiplied by #of observation per condition
li.state.predicted.counts=listener.state.predictions*Tr.inter.state[1] # they're all the same ayway

## correlation scores
pearson.correlation.coeff1=c()
for (i in 1:length(samples[,1])){
  # one df for each sample vector
  df.li.state.predicted.counts1=as.data.frame(melt(listener.state.fake.data[i,,]))
  colnames(df.li.state.predicted.counts1)=c("expression","state","prediction1")
  # rearrange by expression, so that it matches the order in df.s
  df.li.state.predicted.counts1=arrange(df.li.state.predicted.counts1,expression)
  # one corr coeff for each sample vector
  pearson.correlation.coeff1[i]=cor.test(x=df.s$data,y=df.li.state.predicted.counts1$prediction1,method="pearson",exact=FALSE)$estimate
}
# plot density of corr. coeff. together with summary (mean and hdis)
plot(density(pearson.correlation.coeff1), xlim=c(0,1), xlab="Pearson cor", sub=("state of the world choice") ,main=paste("mean=",round(mean(pearson.correlation.coeff1),3),"HDI=",round(HDIofMCMC(pearson.correlation.coeff1)[1],3),"-",round(HDIofMCMC(pearson.correlation.coeff1)[2],3)))

# now we plot count data as bars with bootstr. cis and posterior predictive checks
# ppcs: mean fake data and hdis, from probabilities to counts
li.state.mean.fake=matrix(nrow=length(states),ncol=length(messages))
li.state.low.hdis=matrix(nrow=length(states),ncol=length(messages))
li.state.high.hdis=matrix(nrow=length(states),ncol=length(messages))
for (s in 1:length(states)){
  for (m in 1:length(messages)){
    li.state.mean.fake[s,m]=mean(listener.state.fake.data[,m,s])
    li.state.low.hdis[s,m]=HDIofMCMC(listener.state.fake.data[,m,s])[1]
    li.state.high.hdis[s,m]=HDIofMCMC(listener.state.fake.data[,m,s])[2]
  }
}
row.names(li.state.mean.fake)=row.names(li.state.low.hdis)=row.names(li.state.high.hdis)=states  
colnames(li.state.mean.fake)=colnames(li.state.low.hdis)=colnames(li.state.high.hdis)=messages
# add columns 
df.s$fake_data=as.data.frame(melt(li.state.mean.fake))$value
df.s$low.hdi=as.data.frame(melt(li.state.low.hdis))$value
df.s$high.hdi=as.data.frame(melt(li.state.high.hdis))$value
# better looking names
levels(df.s$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
# state as factor
df.s$state=as.factor(df.s$state)

# add cis to observed data
levels(df.s.cis$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
df.s.cis <- arrange(df.s.cis,expression)
df.s$ci.low <- df.s.cis$ci.low
df.s$mean <- df.s.cis$mean
df.s$ci.high <- df.s.cis$ci.high

# plots with cis
state.bars.ci=ggplot(data=df.s)+
  geom_bar(aes(x=state,y=data),fill="firebrick",stat="identity")+
  # geom_ribbon(aes(x=state, ymin=mean-ci.low, ymax=mean+ci.high, group=expression), fill="firebrick", alpha="0.5")+
  geom_point(aes(x=state,y=mean, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=state,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  #ylab("choice counts")+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())
show(state.bars.ci)

# prediction vs data plot, w bootstrapped cis and hdis
state.vs.ppc.ci=ggplot(data=df.s)+
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=low.hdi, xmax=high.hdi, ymin=mean-ci.low, ymax=mean+ci.high, fill=state), alpha=0.25) +
  geom_errorbar(aes(x=fake_data,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black")+
  geom_errorbarh(aes(x=fake_data,y=data,xmin=low.hdi, xmax=high.hdi, group=expression), colour="black")+
  geom_point(size=3, aes(x=fake_data,y=data,fill=state), pch=21, colour="black")+
  facet_wrap(facets = ~expression, ncol=3)+
  xlab("prediction")+
  ylab("data")+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom",axis.title.x = element_blank(),axis.title.y = element_blank())+
  guides(fill=guide_legend(title="s",nrow = 1))
show(state.vs.ppc.ci)

# prediction only, as bars, with hdis
state.bars.hdi=ggplot(data=df.s)+
  geom_bar(aes(x=state,y=fake_data),fill="firebrick",stat="identity")+
  geom_point(aes(x=state,y=fake_data, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=state,ymin=low.hdi, ymax=high.hdi, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())
show(state.bars.hdi)


# inference of ACCESS
# counts of access choices
df.a=as.data.frame(melt(xtabs(~access+expression,df.interpretation.value)))
colnames(df.a)=c("access","expression","data")
# speaker predictions as counts, ie multiplied by #of observation per condition
li.access.predicted.counts=listener.access.predictions*Tr.inter.value[1] # they're all the same ayway

## cor. scores
pearson.correlation.coeff1=c()
for (i in 1:length(samples[,1])){
  # one df for each sample vector
  df.li.access.predicted.counts1=as.data.frame(melt(listener.access.fake.data[i,,]))
  colnames(df.li.access.predicted.counts1)=c("expression","access","prediction1")
  # rearrange by expression, so that it matches the order in df.a
  df.li.access.predicted.counts1=arrange(df.li.access.predicted.counts1,expression)
  # one corr coeff for each sample vector
  pearson.correlation.coeff1[i]=cor.test(x=df.a$data,y=df.li.access.predicted.counts1$prediction1,method="pearson",exact=FALSE)$estimate
}
# plot density of corr. coeff. together with summary (mean and hdis)
plot(density(pearson.correlation.coeff1), xlim=c(0,1), xlab="Pearson cor", sub=("access value choice") ,main=paste("mean=",round(mean(pearson.correlation.coeff1),3),"HDI=",round(HDIofMCMC(pearson.correlation.coeff1)[1],3),"-",round(HDIofMCMC(pearson.correlation.coeff1)[2],3)))


# now we plot count data as bars with cis, together with ppcs
# ppcs: mean fake data and hdis, from probabilities to counts
li.access.mean.fake=matrix(nrow=length(access.inter),ncol=length(messages))
li.access.low.hdis=matrix(nrow=length(access.inter),ncol=length(messages))
li.access.high.hdis=matrix(nrow=length(access.inter),ncol=length(messages))
for (a in 1:length(access.inter)){
  for (m in 1:length(messages)){
    li.access.mean.fake[a,m]=mean(listener.access.fake.data[,m,a])
    li.access.low.hdis[a,m]=HDIofMCMC(listener.access.fake.data[,m,a])[1]
    li.access.high.hdis[a,m]=HDIofMCMC(listener.access.fake.data[,m,a])[2]
  }
}
row.names(li.access.mean.fake)=row.names(li.access.low.hdis)=row.names(li.access.high.hdis)=access.inter  
colnames(li.access.mean.fake)=colnames(li.access.low.hdis)=colnames(li.access.high.hdis)=messages
# add columns 
df.a$fake_data=as.data.frame(melt(li.access.mean.fake))$value
df.a$low.hdi=as.data.frame(melt(li.access.low.hdis))$value
df.a$high.hdi=as.data.frame(melt(li.access.high.hdis))$value
# better looking names
levels(df.a$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
# access as factor
df.a$access=as.factor(df.a$access)

# add cis to observed data
levels(df.a.cis$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
df.a.cis <- arrange(df.a.cis,expression)
df.a$ci.low <- df.a.cis$ci.low
df.a$mean <- df.a.cis$mean
df.a$ci.high <- df.a.cis$ci.high

# plots with cis
access.bars.ci=ggplot(data=df.a)+
  geom_bar(aes(x=access,y=data),fill="forestgreen",stat="identity")+
  # geom_ribbon(aes(x=access, ymin=mean-ci.low, ymax=mean+ci.high, group=expression), fill="firebrick", alpha="0.5")+
  geom_point(aes(x=access,y=mean, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=access,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  #ylab("choice counts")+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())
show(access.bars.ci)

# prediction vs data plot, w bootstrapped cis and hdis
access.vs.ppc.ci=ggplot(data=df.a)+
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=low.hdi, xmax=high.hdi, ymin=mean-ci.low, ymax=mean+ci.high, fill=access), alpha=0.25) +
  geom_errorbar(aes(x=fake_data,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black")+
  geom_errorbarh(aes(x=fake_data,y=data,xmin=low.hdi, xmax=high.hdi, group=expression), colour="black")+
  geom_point(size=3, aes(x=fake_data,y=data,fill=access),pch=21, colour="black")+
  facet_wrap(facets = ~expression, ncol=3)+
  xlab("prediction")+
  ylab("data")+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position = "bottom",axis.title.x = element_blank(),axis.title.y = element_blank())+
  guides(fill=guide_legend(title="a",nrow = 1))
show(access.vs.ppc.ci)

# prediction only, as bars, with hdis
access.bars.hdi=ggplot(data=df.a)+
  geom_bar(aes(x=access,y=fake_data),fill="forestgreen",stat="identity")+
  geom_point(aes(x=access,y=fake_data, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=access,ymin=low.hdi, ymax=high.hdi, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())
show(access.bars.hdi)

# inference of OBSERVATION: data frame with observed counts of observation choices and predicted counts (probabilities*#observations) given expression condition,
# counts of observation choices
df.o=as.data.frame(melt(xtabs(~observation+expression,df.interpretation.value)))
colnames(df.o)=c("observation","expression","data")
# speaker predictions as counts, ie multiplied by #of observation per condition
li.observation.predicted.counts=listener.observation.predictions*Tr.inter.value[1] # they're all the same ayway

## cor. scores
pearson.correlation.coeff1=c()
for (i in 1:length(samples[,1])){
  # one df for each sample vector
  df.li.observation.predicted.counts1=as.data.frame(melt(listener.observation.fake.data[i,,]))
  colnames(df.li.observation.predicted.counts1)=c("expression","observation","prediction1")
  # rearrange by expression, so that it matches the order in df.o
  df.li.observation.predicted.counts1=arrange(df.li.observation.predicted.counts1,expression)
  # one corr coeff for each sample vector
  pearson.correlation.coeff1[i]=cor.test(x=df.o$data,y=df.li.observation.predicted.counts1$prediction1,method="pearson",exact=FALSE)$estimate
}
# plot density of corr. coeff. together with summary (mean and hdis)
plot(density(pearson.correlation.coeff1), xlim=c(0,1), xlab="Pearson cor", sub=("observation value choice") ,main=paste("mean=",round(mean(pearson.correlation.coeff1),3),"HDI=",round(HDIofMCMC(pearson.correlation.coeff1)[1],3),"-",round(HDIofMCMC(pearson.correlation.coeff1)[2],3)))

# now we plot count data as bars with cis together with posterior predictive checks
# ppcs: mean fake data and hdis, from probabilities to counts
li.observation.mean.fake=matrix(nrow=length(observation.inter),ncol=length(messages))
li.observation.low.hdis=matrix(nrow=length(observation.inter),ncol=length(messages))
li.observation.high.hdis=matrix(nrow=length(observation.inter),ncol=length(messages))
for (o in 1:length(observation.inter)){
  for (m in 1:length(messages)){
    li.observation.mean.fake[o,m]=mean(listener.observation.fake.data[,m,o])
    li.observation.low.hdis[o,m]=HDIofMCMC(listener.observation.fake.data[,m,o])[1]
    li.observation.high.hdis[o,m]=HDIofMCMC(listener.observation.fake.data[,m,o])[2]
  }
}
row.names(li.observation.mean.fake)=row.names(li.observation.low.hdis)=row.names(li.observation.high.hdis)=observation.inter  
colnames(li.observation.mean.fake)=colnames(li.observation.low.hdis)=colnames(li.observation.high.hdis)=messages
# add columns 
df.o$fake_data=as.data.frame(melt(li.observation.mean.fake))$value
df.o$low.hdi=as.data.frame(melt(li.observation.low.hdis))$value
df.o$high.hdi=as.data.frame(melt(li.observation.high.hdis))$value
# better looking names
levels(df.o$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
# observation as factor
df.o$observation=as.factor(df.o$observation)

# add cis to observed data
levels(df.o.cis$expression)=c("likely","possible", "unlikely", "certainly lik.", "certainly poss.", "certainly unlik.", "probably lik.", "probably poss.", "probably unlik.", "might be lik.", "might be poss.", "might be unlik.")
df.o.cis <- arrange(df.o.cis,expression)
df.o$ci.low <- df.o.cis$ci.low
df.o$mean <- df.o.cis$mean
df.o$ci.high <- df.o.cis$ci.high

# plots with cis
observation.bars.ci=ggplot(data=df.o)+
  geom_bar(aes(x=observation,y=data),fill="dodgerblue4",stat="identity")+
  # geom_ribbon(aes(x=observation, ymin=mean-ci.low, ymax=mean+ci.high, group=expression), fill="firebrick", alpha="0.5")+
  geom_point(aes(x=observation,y=mean, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=observation,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  #ylab("choice counts")+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom",axis.title.y = element_blank())
show(observation.bars.ci)

# prediction vs data plot, w bootstrapped cis and hdis
observation.vs.ppc.ci=ggplot(data=df.o)+
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=low.hdi, xmax=high.hdi, ymin=mean-ci.low, ymax=mean+ci.high, fill=observation), alpha=0.25) +
  geom_errorbar(aes(x=fake_data,ymin=mean-ci.low, ymax=mean+ci.high, group=expression), colour="black")+
  geom_errorbarh(aes(x=fake_data,y=data,xmin=low.hdi, xmax=high.hdi, group=expression), colour="black")+
  geom_point(size=3, aes(x=fake_data,y=data,fill=observation), pch=21,colour="black")+
  facet_wrap(facets = ~expression, ncol=3)+
  # xlab("prediction")+
  # ylab("data")+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position = "bottom",axis.title.x = element_blank(),axis.title.y = element_blank())+
  guides(fill=guide_legend(title="o",nrow = 1))
show(observation.vs.ppc.ci)

# prediction only, as bars, with hdis
observation.bars.hdi=ggplot(data=df.o)+
  geom_bar(aes(x=observation,y=fake_data),fill="dodgerblue4",stat="identity")+
  geom_point(aes(x=observation,y=fake_data, group=expression),color="black",size=1.5)+
  geom_errorbar(aes(x=observation,ymin=low.hdi, ymax=high.hdi, group=expression), colour="black", width=0.5)+
  facet_wrap(facets=~expression,ncol=3)+
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,20))+
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom",axis.title.y = element_blank())
show(observation.bars.hdi)

# long plot with three interpretation data plots together
bars.long.ci=grid.arrange(state.bars.ci,access.bars.ci,observation.bars.ci, ncol = 3,
                          left=textGrob("choice count", gp=gpar(fontsize=25), rot = 90, just = "centre")) 
show(bars.long.ci)

# three vs plots together
vs.long.ppc.ci=grid.arrange(state.vs.ppc.ci,access.vs.ppc.ci,observation.vs.ppc.ci, ncol = 3,
                            left=textGrob("data", gp=gpar(fontsize=25), rot = 90, just = "centre"),
                            bottom=textGrob("prediction", gp=gpar(fontsize=25), rot = 0, just = "centre")) 
show(vs.long.ppc.ci)

# long plot with three interpretation predictions plots together
bars.long.hdi=grid.arrange(state.bars.hdi,access.bars.hdi,observation.bars.hdi, ncol = 3,
                          left=textGrob("predicted count", gp=gpar(fontsize=25), rot = 90, just = "centre")) 
show(bars.long.hdi)


### MF: check whether speaker / listener posterior predictive supports the general patterns
post.pred.s = melt(speaker.fake.data) %>%  as.tibble() %>% 
  rename(sample = Var1, 
         value = Var2,
         expression = Var3,
         count = value) 

post.pred.s.mean.counts = post.pred.s %>%  group_by(value, expression) %>% 
  summarize(total = sum(count)/1000) 

ggplot(filter(post.pred.s.mean.counts, expression %in% c("is unlikely", "might_be unlikely")), 
              aes(x = expression, y = total )) + 
  facet_wrap(~ value) +
  geom_bar(stat = "identity") +
  coord_flip()

post.pred.l = melt(listener.state.fake.data) %>% as.tibble() %>% 
  rename(sample = Var1, 
         expression = Var2,
         choice = Var3,
         count = value)

post.pred.l.mean.counts = post.pred.l %>%  group_by(expression, choice) %>% 
  summarize(total = sum(count)/1000) %>% 
  ungroup() %>% group_by(expression) %>% 
  mutate(N = sum(total))

post.pred.l.mean.choice = post.pred.l.mean.counts %>% 
  group_by(expression) %>% 
  summarize(mean.interpretation = (total %*% choice) / N)

ggplot(post.pred.l.mean.counts, aes(x = choice, y = total)) + 
  facet_wrap(~ expression, ncol = 3) + 
  geom_bar(stat = "identity")

