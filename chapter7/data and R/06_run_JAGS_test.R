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
parameters=c(
             'speaker.prob',
             'hypergeometric',
             'rational.bel',
             'listener.prob',
             'listener.prob.value',
             'listener.prob.state'
)

# jags model
model="jags_model_test.R"

# # command to get samples
j.samples = jags(data=dataList,
                 parameters.to.save = parameters,
                 model.file = model,
                 n.chains=1, n.iter=5, # how many chain, how many iterations?
                 n.burnin=1, n.thin=1, DIC=F) # burn in, thinning values, compute DIC

## check speaker prediction for a particular value
value_to_check = 63
j.samples$BUGSoutput$sims.list$speaker.prob[1,,] %>% melt() %>%
  rename(OA = Var1, expression = Var2, probability = value) %>%
  mutate(message = messages[expression],
         value = V.inter[OA]) %>%
  select(value, message, probability) %>% 
  filter(value == value_to_check) %>% arrange(-probability)

## speaker belief computation
j.samples$BUGSoutput$sims.list$rational.bel[1,,] %>%  melt() %>% as_tibble() %>%
  rename(OA = Var1, state = Var2, belief = value) %>% 
  mutate(value = V.inter[OA],
         state = state-1) %>%
  select(value, state, belief) %>% 
  filter(value == 86)

## hypergeometric model
j.samples$BUGSoutput$sims.list$hypergeometric[1,,] %>%  melt() %>% as_tibble() %>%
  rename(OA = Var1, state = Var2, prob = value) %>% 
  mutate(value = V.inter[OA],
         state = state) %>%
  select(value, state, prob) %>% 
  filter(value == 86)

## check listener access/observation inference for a particular message
message_to_check = "is likely"
j.samples$BUGSoutput$sims.list$listener.prob.value[1,,] %>% melt() %>%  as_tibble() %>%
  rename(OA = Var2, expression = Var1, probability = value) %>%
  mutate(message = messages[expression],
         value = V.inter[OA],
         access = ifelse(value==1010,10,trunc(value/10)),
         observation = ifelse(value==1010,10,value-10*trunc(value/10))) %>%
  select(message, access, observation, probability) %>% 
  filter(message == message_to_check) %>%
  group_by(observation) %>% # select here whether to look at access or observation
  summarize(probability = sum(probability)) %>% 
  arrange(-probability)

## check listener state inference for a particular message
message_to_check = "is likely"
j.samples$BUGSoutput$sims.list$listener.prob.state[1,,] %>% melt() %>%  as_tibble() %>%
  rename(state = Var2, expression = Var1, probability = value) %>%
  mutate(message = messages[expression],
         state = state -1) %>%
  select(message, state, probability) %>% 
  filter(message == message_to_check) %>% arrange(-probability)

