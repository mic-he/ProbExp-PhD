## you may have to run '00_preamble.R' first

load('j.samples.Rdata')

# store variables to put into LaTeX in this list
myvars = list()

############################################
############################################
### PPC plots
############################################
############################################

# to scale pictures uniformly
scale_factor = 1
height = 13 * scale_factor
width = 20 * scale_factor


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

max <- max(PPC.expression$upper, production.data$percentage)
PPC.expression.plot = ggplot(PPC.expression, aes(x = message, y = mean_count, fill = message)) + 
  geom_bar(stat = "identity") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  geom_point(data = production.data, aes(x = message, y = percentage), color = "firebrick", shape = "x", size = 5) +
  # geom_errorbar(data = production.data, aes(x = message, y = percentage, ymin = ci.low, ymax = ci.high), color = "firebrick", width = 0.5) +
  facet_wrap(~condition, ncol = 5) +
  ylab("choice %") + 
  scale_y_continuous(limits = c(0,max), breaks=seq(0,max,20)) +
  coord_flip()+
  xlab("expression") +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="none",panel.spacing.x=unit(1, "lines"))
ggsave(filename = "pics/PPCProduction.pdf", plot = PPC.expression.plot, height = height, width = width)


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
                          ordered = T, levels = messgLevelsShort),
         state = state -1) %>%  
  select(iter, message, state, counts) %>% 
  group_by(iter, message) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  group_by(message, state) %>% 
  summarize(mean_count = mean(counts) ,
            lower = HDIofMCMC(counts)[1],
            upper = HDIofMCMC(counts)[2])


# plot
PPC.state.plot = ggplot(PPC.state, aes(y = mean_count, x = state)) + 
  geom_bar(stat="identity", fill = "darkgray") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  geom_point(data = filter(interpretation.data, condition == "state"), 
             aes(x = response, y = counts), size = 5, shape = "x", color = "firebrick") +
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(1,3,6,9)) +
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
  summarize(mean_count = mean(counts) ,
            lower = HDIofMCMC(counts)[1],
            upper = HDIofMCMC(counts)[2])

# plot
PPC.access.plot = ggplot(PPC.access, aes(y = mean_count, x = access)) + 
  geom_bar(stat="identity", fill = "navajowhite4") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  geom_point(data = filter(interpretation.data, condition == "access"), 
             aes(x = response, y = counts), size = 5, shape = "x", color = "firebrick") +
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(1,3,6,9)) +
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
  summarize(mean_count = mean(counts) ,
            lower = HDIofMCMC(counts)[1],
            upper = HDIofMCMC(counts)[2])

# plot
PPC.observation.plot = ggplot(PPC.observation, aes(y = mean_count, x = observation)) + 
  geom_bar(stat="identity", fill = "lightsteelblue3") +
  geom_errorbar(aes(ymin = lower, ymax = upper), width=0.5) + 
  geom_point(data = filter(interpretation.data, condition == "observation"), 
             aes(x = response, y = counts), size = 5, shape = "x", color = "firebrick") +
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(1,3,6,9)) +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())


############################################
### joining interpretation plots
############################################

pdf("pics/PPCInterpretation.pdf", width = width, height = height)
grid.arrange(PPC.state.plot,
                             PPC.access.plot,
                             PPC.observation.plot, 
                             ncol = 3, 
                             left=textGrob("predicted counts", gp=gpar(fontsize=25), rot = 90, just = "centre")) 
dev.off()


############################################
############################################
### summary statistics
############################################
############################################


parameters = j.samples$BUGSoutput$sims.list %>% melt() %>% 
  filter(! L1 %in% c("PPC.expression",
                     "PPC.value",
                     "PPC.state",
                     "deviance")) %>% 
  rename(parameter = L1) %>% 
  select(parameter, value) %>% 
  group_by(parameter) %>% 
  summarize(lower = HDIofMCMC(value)[1] %>% round(3),
            mean =  mean(value) %>% round(3),
            upper = HDIofMCMC(value)[2] %>% round(3)) %>% 
  mutate(parameter = str_remove(parameter, "_"),
         parameter = str_remove(parameter, fixed(".")))

# transpose tibble
rownames(parameters) = parameters$parameter
parameters.flipped = select(parameters, - parameter) %>%
  rownames_to_column %>% 
  gather(var, value, -rowname) %>% 
  spread(rowname, value) 

# save for LaTeX
readr::write_csv(parameters.flipped, path="variables/parameters.csv", col_names = T)


############################################
############################################
### correlation scores
############################################
############################################

############################################
### production
############################################

PPC.expression.full = j.samples$BUGSoutput$sims.list$PPC.expression[,,] %>% melt() %>% as.tibble() %>% 
  rename(iter = Var1, OA = Var2, expression = Var3, counts = value) %>% 
  mutate(message = factor(str_replace(messages[expression], "_", " "), 
                          ordered = T, levels = messgLevels),
         value = V.prod[OA],
         access = ifelse(value==1010,10,trunc(value/10)),
         observation = ifelse(value==1010,10,value-10*trunc(value/10)),
         condition = factor(paste0(observation, " red out of ", access), ordered = T, levels = conditionLevels)) %>% 
  select(iter, condition, message, counts) %>% 
  group_by(iter, condition) %>% 
  mutate(N = sum(counts)) %>% 
  ungroup() %>% 
  mutate(percentage.obs = counts / N[1] * 100) %>% 
  select(iter, condition, message, percentage.obs)

corr.production = inner_join(PPC.expression.full, production.data, by = c("condition", "message")) %>% 
  group_by(iter) %>% 
  summarize(corr = cor.test(x = percentage.obs, y = percentage,
                            method="pearson", exact=FALSE)$estimate) %>% 
  ungroup() %>% 
  summarize(
           lower = HDIofMCMC(corr)[1],
           mean = mean(corr),
           upper = HDIofMCMC(corr)[2],) %>% 
  mutate(condition = "expression")

############################################
### interpretation
############################################

## state 

PPC.state.full = j.samples$BUGSoutput$sims.list$PPC.state[,,] %>% melt() %>% 
  as.tibble() %>% 
  rename(iter = Var1, state = Var3, expression = Var2, counts = value) %>% 
  mutate(message = factor(messgLevelsShort[expression], 
                          ordered = T, levels = messgLevelsShort),
         state = state-1) %>%  
  select(iter, message, state, counts) %>% arrange(iter,message,state)
  

corr.state = full_join(PPC.state.full, filter(interpretation.data %>% 
                                                 rename(state = response), condition == "state"), 
                        by = c("message", "state")) %>% 
  group_by(iter) %>% 
  summarize(corr = cor.test(x = counts.x, y = counts.y,
                            method="pearson", exact=FALSE)$estimate) %>% 
  ungroup() %>% 
  summarize(
    lower = HDIofMCMC(corr)[1],
    mean = mean(corr),
    upper = HDIofMCMC(corr)[2],) %>% 
  mutate(condition = "state")

## access 

PPC.access.full = PPC.value %>% 
  group_by(iter,message,access) %>% 
  summarize(counts = sum(counts)) 

corr.access = inner_join(PPC.access.full, filter(interpretation.data %>% rename(access = response), condition == "access"), 
                        by = c("message", "access")) %>% 
  group_by(iter) %>% 
  summarize(corr = cor.test(x = counts.x, y = counts.y,
                            method="pearson", exact=FALSE)$estimate) %>% 
  ungroup() %>% 
  summarize(
    lower = HDIofMCMC(corr)[1],
    mean = mean(corr),
    upper = HDIofMCMC(corr)[2],) %>% 
  mutate(condition = "access")


## observation 

PPC.observation.full = PPC.value %>% 
  group_by(iter,message,observation) %>% 
  summarize(counts = sum(counts)) 

corr.observation = inner_join(PPC.observation.full, filter(interpretation.data %>% rename(observation = response), condition == "observation"), 
                         by = c("message", "observation")) %>% 
  group_by(iter) %>% 
  summarize(corr = cor.test(x = counts.x, y = counts.y,
                            method="pearson", exact=FALSE)$estimate) %>% 
  ungroup() %>% 
  summarize(
    lower = HDIofMCMC(corr)[1],
    mean = mean(corr),
    upper = HDIofMCMC(corr)[2],) %>% 
  mutate(condition = "observation")

## taken together
correlation = bind_rows(corr.production,
                    corr.state,
                    corr.access,
                    corr.observation)
# transpose tibble
rownames(correlation) = correlation$condition
correlation = select(correlation, - condition) %>%
  rownames_to_column %>% 
  gather(var, value, -rowname) %>% 
  spread(rowname, value) %>% 
  select(var, expression, state, access, observation) %>% 
  mutate(expression = round(expression,3),
         state = round(state,3),
         access = round(access,3),
         observation = round(observation,3))
show(correlation)
# save for LaTeX
readr::write_csv(correlation, path="variables/correlation.csv", col_names = T)

############################################
############################################
### cumulative densities of thresholds
############################################
############################################

x.pos <- density(j.samples$BUGSoutput$sims.list$theta.possible)$x
y.pos <- cumsum(density(j.samples$BUGSoutput$sims.list$theta.possible)$y)
x.pro <- density(j.samples$BUGSoutput$sims.list$theta.probably)$x
y.pro <- cumsum(density(j.samples$BUGSoutput$sims.list$theta.probably)$y)
x.cer <- density(j.samples$BUGSoutput$sims.list$theta.certainly)$x
y.cer <- cumsum(density(j.samples$BUGSoutput$sims.list$theta.certainly)$y)
x.lik <- density(j.samples$BUGSoutput$sims.list$theta.likely)$x
y.lik <- cumsum(density(j.samples$BUGSoutput$sims.list$theta.likely)$y)
x.mig <- density(j.samples$BUGSoutput$sims.list$theta.might)$x
y.mig <- cumsum(density(j.samples$BUGSoutput$sims.list$theta.might)$y)
# data frame
df.cs.th <- as.data.frame(cbind(x.pos, y.pos, x.pro, y.pro, x.cer, y.cer, x.lik, y.lik, x.mig, y.mig))
# plot
cs.plot <- ggplot(data=df.cs.th[seq(1, nrow(df.cs.th), 15), ])+
  geom_point(aes(x=x.pos, y=y.pos/max(y.pos), color='pos', shape='pos'), size=3)+
  geom_line(aes(x=x.pos, y=y.pos/max(y.pos), color='pos'))+
  geom_vline(xintercept=mean(j.samples$BUGSoutput$sims.list$theta.possible))+
  # annotate("text", x=0.175, y=1, label = paste0("mean=", round(mean(j.samples$BUGSoutput$sims.list$theta.possible),3)), size = 5)+
  geom_point(aes(x=x.pro, y=y.pro/max(y.pro), color='pro', shape='pro'), size=3)+
  geom_line(aes(x=x.pro, y=y.pro/max(y.pro), color='pro'))+
  geom_vline(xintercept=mean(j.samples$BUGSoutput$sims.list$theta.probably))+
  # annotate("text", x=0.475, y=1, label = paste0("mean=", round(mean(j.samples$BUGSoutput$sims.list$theta.probably),3)), size = 5)+
  geom_point(aes(x=x.cer, y=y.cer/max(y.cer), color='cer', shape='cer'), size=3)+
  geom_line(aes(x=x.cer, y=y.cer/max(y.cer), color='cer'))+
  geom_vline(xintercept=mean(j.samples$BUGSoutput$sims.list$theta.certainly))+
  # annotate("text", x=0.875, y=1, label = paste0("mean=", round(mean(j.samples$BUGSoutput$sims.list$theta.certainly),3)), size = 5)+
  geom_point(aes(x=x.lik, y=y.lik/max(y.lik), color='lik', shape='lik'), size=3)+
  geom_line(aes(x=x.lik, y=y.lik/max(y.lik), color='lik'))+
  geom_vline(xintercept=mean(j.samples$BUGSoutput$sims.list$theta.likely))+
  # annotate("text", x=0.875, y=1, label = paste0("mean=", round(mean(j.samples$BUGSoutput$sims.list$theta.likely),3)), size = 5)+
  geom_point(aes(x=x.mig, y=y.mig/max(y.mig), color='mig', shape='mig'), size=3)+
  geom_line(aes(x=x.mig, y=y.mig/max(y.mig), color='mig'))+
  geom_vline(xintercept=mean(j.samples$BUGSoutput$sims.list$theta.might))+
  # annotate("text", x=mean(j.samples$BUGSoutput$sims.list$theta.might)-0.2, y=1, label = paste0("mean=", round(mean(j.samples$BUGSoutput$sims.list$theta.might),3)), size = 5)+
  xlab("P(s)")+
  ylab("cumulative density")+
  theme_bw()+
  theme(strip.background = element_blank(),
        text=element_text(size=22),
        legend.position = "bottom")+
  scale_colour_manual(name="expression",
                      values=c("pos" = "firebrick", "pro"="forestgreen", "cer"="dodgerblue4", 'lik' = "salmon", 'mig' = 'palevioletred3'),
                      labels=c("pos"="possibly","pro"="probably", "cer"="certainly", 'lik' = 'likely', 'mig' = 'might'))+
  scale_shape_manual(name="expression",
                     values=c("pos" = 15, "pro"=16, "cer"=17, 'lik' = 18, 'mig' = 19),
                     labels=c("pos"="possibly","pro"="probably", "cer"="certainly", 'lik' = 'likely', 'mig' = 'might'))
show(cs.plot)
ggsave('pics/thresholds.pdf', cs.plot, width = 10, height = 6)


############################################
############################################
### store variables to enter in LaTeX
############################################
############################################

myvars['nchains'] = as.character(j.samples$BUGSoutput$n.chains)
myvars['burnin'] = j.samples$BUGSoutput$n.burnin %>% as.character()
myvars['thin'] = j.samples$BUGSoutput$n.thin
myvars['iterations'] = as.character(j.samples$BUGSoutput$n.iter)
myvars['nsamples'] = j.samples$BUGSoutput$n.sims %>% as.character()

myvars = as_tibble(myvars)
readr::write_csv(myvars, path = "variables/postprocessing.csv", col_names = T)

