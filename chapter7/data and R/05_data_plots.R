## you may have to run '00_preamble.R' first

############################################
############################################
### plot observed data
############################################
############################################

# to scale pictures uniformly
scale_factor = 1
height = 13 * scale_factor
width = 20 * scale_factor


############################################
### production
############################################

# `production.data` is computed in `00_preamble.R`

max <- max(production.data$ci.high)
production.plot = ggplot(production.data , aes(x = message, y = percentage, fill = message)) +
  geom_bar(stat = "identity") +
  geom_errorbar(aes(ymin = ci.low, ymax = ci.high), width=0.5) +
  facet_wrap(~condition, ncol = 5) +
  ylab("choice %") +
  scale_y_continuous(limits = c(0,max), breaks=seq(0,max,20)) +
  coord_flip()+
  xlab("expression") +
  theme_bw()+
  theme(strip.background = element_blank(),text=element_text(size=27),legend.position="none",panel.spacing.x=unit(1, "lines"))
ggsave(filename = "pics/dataProduction.pdf", plot = production.plot, height = height, width = width)
  
############################################
### interpretation
############################################

# `interpretation.data` is computed in `00_preamble.R`

interpretation.plot.state = ggplot(filter(interpretation.data, condition == "state"), aes(y = counts, x = response)) + 
  geom_bar(stat="identity", fill = "firebrick") +
  geom_errorbar(aes(ymin = mean-ci.low, ymax = mean+ci.high), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  xlab("state") +
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())

interpretation.plot.access = ggplot(filter(interpretation.data, condition == "access"), aes(y = counts, x = response)) + 
  geom_bar(stat="identity", fill = "forestgreen") +
  geom_errorbar(aes(ymin = mean-ci.low, ymax = mean+ci.high), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  xlab("access") +
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())

interpretation.plot.observation = ggplot(filter(interpretation.data, condition == "observation"), aes(y = counts, x = response)) + 
  geom_bar(stat="identity", fill = "dodgerblue4") +
  geom_errorbar(aes(ymin = mean-ci.low, ymax = mean+ci.high), width=0.5) + 
  facet_wrap(~message, ncol = 3) +
  scale_y_continuous(limits = c(0,100), breaks=seq(0,100,25))+
  scale_x_continuous(breaks=c(3,6,9)) +
  theme_bw()+
  xlab("observation") +
  theme(strip.background = element_blank(),text=element_text(size=25),
        legend.position="bottom", axis.title.y = element_blank())

pdf("pics/dataInterpretation.pdf", width = width, height = height)
grid.arrange(interpretation.plot.state,
             interpretation.plot.access,
             interpretation.plot.observation, 
             ncol = 3, 
             left=textGrob("choice count", gp=gpar(fontsize=25), rot = 90, just = "centre")) 
dev.off()
