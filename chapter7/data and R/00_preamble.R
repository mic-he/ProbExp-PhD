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
library(bootstrap)

# source functions
source("01_useful_functions.r") # various useful definitions
source("02_prediction_functions.r") # the prediction functions, ie R implementation of the model 

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


#############################################################################
#############################################################################
## MF additions : prepare data for plotting and correlation
#############################################################################
#############################################################################

############################################
### production data
############################################

messgLevels = c("is likely","is possible", "is unlikely", 
                "is certainly likely", "is certainly possible", "is certainly unlikely", 
                "is probably likely", "is probably possible", "is probably unlikely", 
                "might be likely", "might be possible", "might be unlikely")[c(6,3,9,12,11,8,2,5,10,7,1,4)]

access = ifelse(V.prod==1010,10,trunc(V.prod/10))
observation = ifelse(V.prod==1010,10,V.prod-10*trunc(V.prod/10))
conditionLevels = paste0(observation, " red out of ", access)[c(1,3,4,5,2,6,7,8,9,10,11,12,13,14,15)]

production.data.cis = df.e.cis %>% as_tibble() %>%
  mutate(message = factor(str_replace(message, "_", " "), 
                          ordered = T, levels = messgLevels),
         access = ifelse(value==1010,10,trunc(value/10)),
         observation = ifelse(value==1010,10,value-10*trunc(value/10)),
         condition = factor(paste0(observation, " red out of ", access), ordered = T, levels = conditionLevels),
         ci.low = (mean-ci.low) ,
         ci.high = (mean+ci.high),
         mean = mean) %>% 
  select(condition, message, ci.low, mean, ci.high) %>% 
  arrange(condition, message)

production.data = as_tibble(melt(xtabs( ~ answer.full + OA, df.production %>% rename(OA = value)))) %>% 
  mutate(message = factor(str_replace(messages[answer.full], "_", " "), 
                          ordered = T, levels = messgLevels),
         access = ifelse(OA==1010,10,trunc(OA/10)),
         observation = ifelse(OA==1010,10,OA-10*trunc(OA/10)),
         condition = factor(paste0(observation, " red out of ", access), ordered = T, levels = conditionLevels)) %>% 
  select(condition, message, value) %>% 
  arrange(condition, message) %>% 
  group_by(condition) %>% 
  mutate(N = sum(value)) %>% 
  ungroup() %>% 
  mutate(percentage = value/N[1] * 100) %>% 
  select(condition, message, percentage)

production.data = inner_join(production.data, production.data.cis, by = c("condition", "message"))

############################################
### interpretation data
############################################

messgLevelsShort = c("likely","possible", "unlikely", 
                     "certainly lik.", "certainly poss.", "certainly unlik.", 
                     "probably lik.", "probably poss.", "probably unlik.", 
                     "might be lik.", "might be poss.", "might be unlik.")

interpretation.data.s.cis = df.s.cis %>% as_tibble() %>% 
  mutate(message = case_when(expression == "is likely" ~ "likely",
                             expression == "is possible" ~ "possible",
                             expression == "is unlikely" ~ "unlikely",
                             expression == "is_certainly likely" ~ "certainly lik.",
                             expression == "is_probably likely" ~ "probably lik.",
                             expression == "might_be likely" ~ "might be lik.",
                             expression == "is_certainly unlikely" ~ "certainly unlik.",
                             expression == "is_probably unlikely" ~ "probably unlik.",
                             expression == "might_be unlikely" ~ "might be unlik.",
                             expression == "is_certainly possible" ~ "certainly poss.",
                             expression == "is_probably possible" ~ "probably poss.",
                             expression == "might_be possible" ~ "might be poss."
  ),
  message = factor(message, ordered = T, levels = messgLevelsShort),
  condition = "state",
  response = state,
  ) %>% 
  select(message, condition, response, ci.low, mean, ci.high)
  
interpretation.data.a.cis = df.a.cis %>% as_tibble() %>% 
  mutate(message = case_when(expression == "is likely" ~ "likely",
                             expression == "is possible" ~ "possible",
                             expression == "is unlikely" ~ "unlikely",
                             expression == "is_certainly likely" ~ "certainly lik.",
                             expression == "is_probably likely" ~ "probably lik.",
                             expression == "might_be likely" ~ "might be lik.",
                             expression == "is_certainly unlikely" ~ "certainly unlik.",
                             expression == "is_probably unlikely" ~ "probably unlik.",
                             expression == "might_be unlikely" ~ "might be unlik.",
                             expression == "is_certainly possible" ~ "certainly poss.",
                             expression == "is_probably possible" ~ "probably poss.",
                             expression == "might_be possible" ~ "might be poss."
  ),
  message = factor(message, ordered = T, levels = messgLevelsShort),
  condition = "access",
  response = access,
  ) %>% 
  select(message, condition, response, ci.low, mean, ci.high)

interpretation.data.o.cis = df.o.cis %>% as_tibble() %>% 
  mutate(message = case_when(expression == "is likely" ~ "likely",
                             expression == "is possible" ~ "possible",
                             expression == "is unlikely" ~ "unlikely",
                             expression == "is_certainly likely" ~ "certainly lik.",
                             expression == "is_probably likely" ~ "probably lik.",
                             expression == "might_be likely" ~ "might be lik.",
                             expression == "is_certainly unlikely" ~ "certainly unlik.",
                             expression == "is_probably unlikely" ~ "probably unlik.",
                             expression == "might_be unlikely" ~ "might be unlik.",
                             expression == "is_certainly possible" ~ "certainly poss.",
                             expression == "is_probably possible" ~ "probably poss.",
                             expression == "might_be possible" ~ "might be poss."
  ),
  message = factor(message, ordered = T, levels = messgLevelsShort),
  condition = "observation",
  response = observation,
  ) %>% 
  select(message, condition, response, ci.low, mean, ci.high)

interpretation.data = df.interpretation %>% as_tibble() %>% 
  gather(access, observation, state, key = "condition", value = "response") %>% 
  filter(response != "NA") %>% 
  mutate(message = case_when(expression == "is likely" ~ "likely",
                             expression == "is possible" ~ "possible",
                             expression == "is unlikely" ~ "unlikely",
                             expression == "is_certainly likely" ~ "certainly lik.",
                             expression == "is_probably likely" ~ "probably lik.",
                             expression == "might_be likely" ~ "might be lik.",
                             expression == "is_certainly unlikely" ~ "certainly unlik.",
                             expression == "is_probably unlikely" ~ "probably unlik.",
                             expression == "might_be unlikely" ~ "might be unlik.",
                             expression == "is_certainly possible" ~ "certainly poss.",
                             expression == "is_probably possible" ~ "probably poss.",
                             expression == "might_be possible" ~ "might be poss."
                             ),
         message = factor(message, ordered = T, levels = messgLevelsShort)
         ) %>% 
  select(message, condition, response) %>% 
  group_by(message, condition, response) %>% 
  summarize(counts = n()) %>% 
  ungroup() %>% 
  arrange(message, condition, response) 

# fill up the 0s in the table
interpretation.data <- expand.grid(message = unique(interpretation.data$message), 
                        condition = unique(interpretation.data$condition), 
                        response = unique(interpretation.data$response)) %>%
  as_tibble() %>% 
  left_join(interpretation.data, by=c("message","condition","response")) %>%
  mutate(counts = ifelse(is.na(counts),0,counts))


interpretation.data = rbind(inner_join(filter(interpretation.data, condition == "state"), interpretation.data.s.cis),
                            inner_join(filter(interpretation.data, condition == "access"), interpretation.data.a.cis),
                            inner_join(filter(interpretation.data, condition == "observation"), interpretation.data.o.cis)) %>% 
  arrange(message,condition,response)
