library('coda')
library('ggmcmc')
library('jagsUI') # for parallel computing
library('VGAM')

source('helpers.R')
source('bda_process.R')

load("processed_data_bda.RData") # processed data in the vector y.slider is saved in this file

theme_set(theme_bw() + theme(plot.background=element_blank(), strip.background = element_blank(),text=element_text( size=20),axis.text=element_text(size=15)))

readFlag = TRUE

nSubj = length(ids)

if (readFlag){
  load(file = "output.Rdat")
} else {
  source('bda_main.R')
}

#######################
# posteriors
#######################

## parameters
# traceplots
ggs(out$samples) %>% filter(Parameter %in% c("sigma", "k", "alpha", "beta")) %>% ggs_traceplot()


# density
csamples = tbl_df(melt(out$sims.list))
colnames(csamples) = c("value", "step", "subject", "condition", "bin", "variable")
save(csamples, file = "full_samples.Rdat")

load(file="full_samples.Rdat")

p = c("sigma", "k", "alpha","beta")

meansIP <- csamples %>% filter(variable %in% p) %>%
  group_by(variable) %>%
  summarise(
    mean = mean(value),
    max = HDIofMCMC(value)[2],
    min = HDIofMCMC(value)[1]
  )
plotData = csamples %>% select(value, variable) %>% filter(variable %in% p)

save(plotData, file = "full_param.Rdat")

load(file="full_param.Rdat")

plotData$maxHDI = unlist(sapply(1:nrow(plotData), function(x) meansIP[which(meansIP$variable == plotData$variable[x]), 3]))
plotData$minHDI = unlist(sapply(1:nrow(plotData), function(x) meansIP[which(meansIP$variable == plotData$variable[x]), 4]))
posterior_parameters = ggplot(plotData, aes(x = value)) + geom_density() + facet_wrap(~ variable, ncol=2, scales = "free")
show(posterior_parameters)


#######################
# posterior predictives
#######################

## sliders
# get samples
slider_ppv = tbl_df(melt(out$sims.list$y.sliderPPC))
colnames(slider_ppv) = c("step", "subject", "condition", "bin", "value")
# replace placeholder condition value with actual conditions
slider_ppv = slider_ppv %>% group_by(subject, condition, step, bin) %>%
  mutate(condition_real=subj_condition[subject,condition])
# transform and normalize
slider_ppv=slider_ppv %>% mutate(value = logistic(value)) %>%
  group_by(subject, condition, step) %>%
  mutate(nvalue = value / sum(value))

# aggregate subjects
slider_aggr = slider_ppv %>% group_by(condition_real, bin, step) %>%
  summarise(y.rep.mean = mean(nvalue))

# summarise across steps
slider_aggr = slider_aggr %>%  group_by(condition_real, bin) %>%
  summarise(mean = mean(y.rep.mean),
            min = HDIofMCMC(y.rep.mean)[1],
            max = HDIofMCMC(y.rep.mean)[2])

# order and add obsrved means an CIs
slider_aggr = slider_aggr[order(slider_aggr$condition_real,slider_aggr$bin),]
slider_aggr$y_means = y.slider_means$mymean
slider_aggr$cilow = y.slider_means$cilow
slider_aggr$cihigh = y.slider_means$cihigh

save(slider_aggr, file = "full_ppc.Rdat")

load(file="full_ppc.Rdat")

# plot
# plotSliderPPC = ggplot(slider_aggr, aes(x = bin, y = mean)) + geom_line() + geom_point() + facet_wrap(~ condition_real, ncol = 13) + 
#   geom_ribbon(aes(ymin=min, ymax=max), fill="gray", alpha="0.5") +
#   geom_line(aes(x = bin, y = y_means) , color = "firebrick") + geom_point( aes(x = bin, y = y_means) , color = "firebrick") +
#   geom_errorbar(aes(ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'firebrick') +
#   scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
#   ylab("slider rating")
# show(plotSliderPPC)

# try some better looking versions?
#bins are actually "state+1"
slider_aggr$state=slider_aggr$bin-1
#plot w ribbons
plotSliderPPC_ribbon = ggplot(slider_aggr)+
  facet_wrap(~ condition_real, ncol = 13,scales = "free") +
  #geom_bar(aes(x = state, y = y_means),fill="firebrick",stat="identity")+
  geom_ribbon(aes(x=state, ymin=cilow, ymax=cihigh), fill="firebrick", alpha="0.5") +
  geom_point(aes(x = state, y = y_means), color = 'firebrick',size=1)+
  geom_line(aes(x = state, y = y_means), color = 'firebrick')+
  geom_ribbon(aes(x=state, ymin=min, ymax=max), fill="gray", alpha="0.5") +
  geom_line(aes(x = state, y = mean)) +
  #geom_errorbar(aes(x=state, ymin = min, ymax = max), width = .5, position = position_dodge(.1)) +
  geom_point(aes(x = state, y = mean),size=1) +
  #geom_errorbar(aes(x=state, ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'firebrick') +
  #scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
  scale_x_continuous( limits = c(0,10), breaks=seq(0,10,1)) +
  ylab("mean posterior / observed probability")+
  xlab("state")
show(plotSliderPPC_ribbon)


#plot w bars, only data
plotSliderPPC_bars = ggplot(slider_aggr)+
  facet_wrap(~ condition_real, ncol = 13,scales = "free") +
  geom_bar(aes(x = factor(state), y = y_means),fill="firebrick",stat="identity")+
  # geom_ribbon(aes(x=state, ymin=cilow, ymax=cihigh), fill="firebrick", alpha="0.5") +
  # geom_point(aes(x = state, y = y_means), color = 'firebrick',size=1)+
  # geom_line(aes(x = state, y = y_means), color = 'firebrick')+
  # geom_ribbon(aes(x=state, ymin=min, ymax=max), fill="gray", alpha="0.5") +
  # geom_line(aes(x = state, y = mean)) +
  # #geom_errorbar(aes(x=state, ymin = min, ymax = max), width = .5, position = position_dodge(.1)) +
  # geom_point(aes(x = state, y = mean),size=1) +
  geom_errorbar(aes(x=factor(state), ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'black') +
  #scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
  #scale_x_continuous( limits = c(0,10), breaks=seq(0,10,1)) +
  ylab("observed probability")+
  xlab("state")
show(plotSliderPPC_bars)

# plot with points and "confidence areas", data vs prediction
plotSliderPPC_vs =ggplot(slider_aggr)+
  facet_wrap(~ condition_real, ncol = 13,scales = "free") +
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=min, xmax=max, ymin=cilow, ymax=cihigh, fill=factor(state)), alpha=0.25) +
  geom_errorbar(aes(x= mean, ymin =cilow, ymax =cihigh,group=factor(state)), color = 'black') +
  geom_errorbarh(aes(x=mean,y=y_means,xmin=min, xmax=max, group=factor(state)), colour="black")+
  geom_point(aes(x = mean, y = y_means, fill=factor(state)),pch=21,color="black",size=3)+
  ylab("observed probability")+
  xlab("mean posterior")+
  theme(legend.position = "bottom")+
  guides(fill=guide_legend(title="state", nrow=1))
show(plotSliderPPC_vs)


# same, but with only values used in experiments
A.prod=c(2,2,4,4,4,8,8,8,8,8,10,10,10,10,10) # access
O.prod=c(0,2,1,2,3,0,2,4,6,8,2,3,5,7,8) # observation
V.prod=A.prod*10+O.prod # pairs <a,o>
# select only needed values
sub.slider_aggr <- droplevels(subset(slider_aggr,slider_aggr$condition_real %in% V.prod))
# add access and observation columns to df for easier visualization
sub.slider_aggr$access=trunc(sub.slider_aggr$condition_real/10)
sub.slider_aggr$observation=sub.slider_aggr$condition_real-10*sub.slider_aggr$access
# better looking labels for conditions
sub.slider_aggr$label=as.factor(paste0(sub.slider_aggr$observation," red balls out of ",sub.slider_aggr$access))
# change order to make plot more readable
sub.slider_aggr$label = factor(sub.slider_aggr$label,levels(sub.slider_aggr$label)[c(1,3,6,9,5,2,7,10,12,15,4,8,11,13,14)])

# sub.plotSliderPPC = ggplot(sub.slider_aggr, aes(x = bin, y = mean)) + geom_line() + geom_point() + facet_wrap(~ label, nrow = 3, scale = "free") + 
#   geom_ribbon(aes(ymin=min, ymax=max), fill="gray", alpha="0.5") +
#   geom_line(aes(x = bin, y = y_means) , color = "firebrick") + geom_point( aes(x = bin, y = y_means) , color = "firebrick") +
#   geom_errorbar(aes(ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'firebrick') +
#   scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
#   ylab("slider rating")
# show(sub.plotSliderPPC)


# try some better looking versions?
#bins are actually states
sub.slider_aggr$state=sub.slider_aggr$bin-1
#plot w ribbons
sub.plotSliderPPC_ribbons = ggplot(sub.slider_aggr)+
  facet_wrap(~ label, nrow = 3,scales = "free") +
  #geom_bar(aes(x = state, y = y_means),fill="firebrick",stat="identity")+
  # geom_ribbon(aes(x=state, ymin=cilow, ymax=cihigh), fill="firebrick", alpha="0.5") +
  # geom_point(aes(x = state, y = y_means), color = 'firebrick',size=1)+
  # geom_line(aes(x = state, y = y_means), color = 'firebrick')+
  geom_ribbon(aes(x=state, ymin=min, ymax=max), fill="gray", alpha="0.5") +
  geom_line(aes(x = state, y = mean)) +
  #geom_errorbar(aes(x=state, ymin = min, ymax = max), width = .5, position = position_dodge(.1)) +
  geom_point(aes(x = state, y = mean),size=1) +
  #geom_errorbar(aes(x=state, ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'firebrick') +
  #scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
  scale_x_continuous( limits = c(0,10), breaks=seq(0,10,1)) +
  ylab("mean posterior predictive probability")+
  xlab("state")
show(sub.plotSliderPPC_ribbons)

#plot w ribbons
sub.plotSliderData_ribbons = ggplot(sub.slider_aggr)+
  facet_wrap(~ label, nrow = 3,scales = "free") +
  #geom_bar(aes(x = state, y = y_means),fill="firebrick",stat="identity")+
  geom_ribbon(aes(x=state, ymin=cilow, ymax=cihigh), fill="firebrick", alpha="0.5") +
  geom_point(aes(x = state, y = y_means), color = 'firebrick',size=1)+
  geom_line(aes(x = state, y = y_means), color = 'firebrick')+
  # geom_ribbon(aes(x=state, ymin=min, ymax=max), fill="gray", alpha="0.5") +
  # geom_line(aes(x = state, y = mean)) +
  # #geom_errorbar(aes(x=state, ymin = min, ymax = max), width = .5, position = position_dodge(.1)) +
  # geom_point(aes(x = state, y = mean),size=1) +
  #geom_errorbar(aes(x=state, ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'firebrick') +
  #scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
  scale_x_continuous( limits = c(0,10), breaks=seq(0,10,1)) +
  ylab("mean observed probability")+
  xlab("state")
show(sub.plotSliderData_ribbons)

#plot w bars, only data+cis
sub.plotSliderPPC_bars = ggplot(sub.slider_aggr)+
  facet_wrap(~ label, nrow = 3,scales = "free") +
  geom_bar(aes(x = factor(state), y = y_means),fill="firebrick",stat="identity")+
  # geom_ribbon(aes(x=state, ymin=cilow, ymax=cihigh), fill="firebrick", alpha="0.5") +
  # geom_point(aes(x = state, y = y_means), color = 'firebrick',size=1)+
  # geom_line(aes(x = state, y = y_means), color = 'firebrick')+
  # geom_ribbon(aes(x=state, ymin=min, ymax=max), fill="gray", alpha="0.5") +
  # geom_line(aes(x = state, y = mean)) +
  # geom_errorbar(aes(x=state, ymin = min, ymax = max), width = .5, position = position_dodge(.1)) +
  # geom_point(aes(x = state, y = mean),size=1) +
  geom_errorbar(aes(x=factor(state), ymin = cilow, ymax = cihigh), width = .5, position = position_dodge(.1), color = 'black') +
  #scale_y_continuous( limits = c(0,1), breaks=seq(0.00,1.00,0.10)) +
  #scale_x_continuous( limits = c(0,10), breaks=seq(0,10,1)) +
  ylab("observed probability")+
  xlab("state")
show(sub.plotSliderPPC_bars)

# plot with points and "confidence areas", data vs prediction
sub.plotSliderPPC_vs =ggplot(sub.slider_aggr)+
  facet_wrap(~ label, nrow = 3,scales = "free") +
  geom_abline(intercept = 0, slope = 1, color="grey")+
  geom_rect(mapping=aes(xmin=min, xmax=max, ymin=cilow, ymax=cihigh, fill=factor(state)), alpha=0.25) +
  geom_errorbar(aes(x= mean, ymin =cilow, ymax =cihigh,group=factor(state)), color = 'black') +
  geom_errorbarh(aes(x=mean,y=y_means,xmin=min, xmax=max, group=factor(state)), colour="black")+
  geom_point(aes(x = mean, y = y_means, fill=factor(state)),pch=21,color="black",size=4)+
  ylab("mean observed probability")+
  xlab("mean posterior predictive probability")+
  theme(legend.position = "bottom")+
  guides(fill=guide_legend(title="state", nrow=1))
show(sub.plotSliderPPC_vs)

