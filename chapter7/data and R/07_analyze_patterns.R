interpretation.data.regression = interpretation.data %>% 
  mutate(inner = case_when(grepl("unlik", message) ~ "unlikely",
                           grepl("lik", message) ~ "likely",
                           TRUE ~ "possible") %>% factor(ordered = F, levels = c("possible", "likely", "unlikely"))
         ,
         outer = case_when(grepl("certain", message) ~ "certainly",
                           grepl("probably", message) ~ "probably",
                           grepl("might", message) ~ "might",
                           TRUE ~ "is") %>% factor(ordered = F, levels = c("is", "certainly", "probably", "might"))
         ) %>% 
  select(condition, outer, inner, response, counts) %>% 
  uncount(weights = counts, .remove = FALSE)


interpretation.data.summary = interpretation.data.regression %>% 
  group_by(condition, outer, inner) %>% 
  summarize(
            ci.low = quantile(bootstrap(x=response, nboot=1000, theta = mean)$thetastar, 0.025),
            resp.mean = mean(response),
            ci.hi  = quantile(bootstrap(x=response, nboot=1000, theta = mean)$thetastar, 0.975)
            ) %>% 
  ungroup() %>% 
  mutate(outer = factor(outer, ordered = T, levels = c("might", "probably", "is", "certainly")),
         inner = factor(inner, ordered = T, levels = c("unlikely", "possible", "likely")),
         condition = factor(condition, ordered = T, levels = c("state", "access", "condition")))

interpretation.data.summary.save = interpretation.data.summary %>% 
  mutate(ci.lo = round(ci.low,2),
         mean = round(resp.mean,2),
         ci.hi = round(ci.hi,2))
readr::write_csv(interpretation.data.summary.save, path="variables/meanInterpretation.csv", col_names = T)


interpretation.means.plot = ggplot(filter(interpretation.data.summary, condition != "observation"), 
       aes(x = outer, y = resp.mean)) +
  # geom_bar(stat = "identity", fill = "gray") +
  geom_point() + 
  geom_errorbar(aes(ymin = ci.low, ymax = ci.hi), width = 0.5) +
  ylab("mean interpretation choice") + xlab("") + 
  facet_grid(condition~inner, scales = "free") +
  theme_bw()+ coord_flip() +
  theme(strip.background = element_blank(),text=element_text(size=20),legend.position="none",panel.spacing.x=unit(1, "lines"))
ggsave(filename = "pics/meansInterpretation.pdf", plot = interpretation.means.plot, height = 5, width = 12)


# glm(response ~ outer * inner , data = filter(interpretation.data.regression , condition == "state")) %>% summary()

#######################################
## compare to PPCs
#######################################

meanInter.PPC.state = j.samples$BUGSoutput$sims.list$PPC.state[,,] %>% melt() %>% 
  as.tibble() %>% 
  rename(iter = Var1, state = Var3, expression = Var2, counts = value) %>% 
  mutate(message = factor(messgLevelsShort[expression], 
                          ordered = T, levels = messgLevelsShort),
         state = state-1) %>%  
  mutate(inner = case_when(grepl("unlik", message) ~ "unlikely",
                           grepl("lik", message) ~ "likely",
                           TRUE ~ "possible") %>% factor(ordered = F, levels = c("possible", "likely", "unlikely"))
         ,
         outer = case_when(grepl("certain", message) ~ "certainly",
                           grepl("probably", message) ~ "probably",
                           grepl("might", message) ~ "might",
                           TRUE ~ "is") %>% factor(ordered = F, levels = c("is", "certainly", "probably", "might"))
  ) %>% 
  group_by(iter, outer, inner) %>% 
  summarize(mean = state %*% counts / sum(counts)) %>% 
  ungroup() %>% 
  group_by(outer,inner) %>% 
  summarize(lo = HDIofMCMC(mean)[1],
            hi = HDIofMCMC(mean)[2],
            mean = mean(mean)) %>% 
  ungroup() %>% 
  mutate(outer = factor(outer, ordered = T, levels = c("might", "probably", "is", "certainly"))) %>% 
  select(outer, inner, lo, mean, hi) %>% arrange(outer, inner) %>% 
  mutate(condition = "state")

meanInter.PPC.access = PPC.value %>% 
  group_by(iter,message,access) %>% 
  summarize(counts = sum(counts)) %>% 
  ungroup() %>%  
  mutate(inner = case_when(grepl("unlik", message) ~ "unlikely",
                           grepl("lik", message) ~ "likely",
                           TRUE ~ "possible") %>% factor(ordered = F, levels = c("possible", "likely", "unlikely"))
         ,
         outer = case_when(grepl("certain", message) ~ "certainly",
                           grepl("probably", message) ~ "probably",
                           grepl("might", message) ~ "might",
                           TRUE ~ "is") %>% factor(ordered = F, levels = c("is", "certainly", "probably", "might"))
  ) %>% 
  select(iter, outer, inner, access, counts) %>% 
  group_by(iter, outer, inner) %>% 
  summarize(mean = access %*% counts / sum(counts)) %>% 
  ungroup() %>% 
  group_by(outer,inner) %>% 
  summarize(lo = HDIofMCMC(mean)[1],
            hi = HDIofMCMC(mean)[2],
            mean = mean(mean)) %>% 
  ungroup() %>% 
  mutate(outer = factor(outer, ordered = T, levels = c("might", "probably", "is", "certainly"))) %>% 
  select(outer, inner, lo, mean, hi) %>% arrange(outer, inner) %>% 
  mutate(condition = "access")
  

meanInter.PPC = bind_rows(meanInter.PPC.state,meanInter.PPC.access) %>% 
  mutate(condition = factor(condition, ordered = T, levels = c("state", "access")),
         inner = factor(inner, ordered = T, levels = c("unlikely", "possible", "likely")))
  

interpretation.means.plot.PPC = ggplot(meanInter.PPC,
                                       aes(x = outer, y = mean)) +
  # geom_bar(stat = "identity", fill = "gray") +
  geom_point() + geom_line() +
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.5) +
  geom_point(data = filter(interpretation.data.summary, condition != "observation"), 
             aes(x = outer, y = resp.mean),
             size = 5, shape = "x", color = "firebrick") +
  ylab("mean predicted interpretation choice") + xlab("") + 
  facet_grid(condition~inner, scales = "free") +
  theme_bw()+ coord_flip() +
  theme(strip.background = element_blank(),text=element_text(size=20),legend.position="none",panel.spacing.x=unit(1, "lines"))
ggsave(filename = "pics/meansInterpretationPPC.pdf", plot = interpretation.means.plot.PPC, height = 5, width = 12)


########################################################################################
## check if access interpretation of 'certainly (un)likely' is credibly higher than that
## of 'is (un-)likely'
########################################################################################

meanInter.PPC.access.diff = PPC.value %>% 
  group_by(iter,message,access) %>% 
  summarize(counts = sum(counts)) %>% 
  ungroup() %>%  
  mutate(inner = case_when(grepl("unlik", message) ~ "unlikely",
                           grepl("lik", message) ~ "likely",
                           TRUE ~ "possible") %>% factor(ordered = F, levels = c("possible", "likely", "unlikely"))
         ,
         outer = case_when(grepl("certain", message) ~ "certainly",
                           grepl("probably", message) ~ "probably",
                           grepl("might", message) ~ "might",
                           TRUE ~ "is") %>% factor(ordered = F, levels = c("is", "certainly", "probably", "might"))
  ) %>% 
  select(iter, outer, inner, access, counts) %>% 
  group_by(iter, outer, inner) %>% 
  summarize(mean = access %*% counts / sum(counts)) %>% 
  ungroup() %>% 
  filter(inner %in% c('likely','unlikely'), outer %in% c('is', 'certainly')) %>% 
  mutate(message = paste0(outer, ".", inner)) %>% 
  select(iter, message, mean) %>% 
  spread(key = message, value = mean) %>% 
  mutate(certainly.likely.diff = certainly.likely - is.likely,
         certainly.unlikely.diff = certainly.unlikely - is.unlikely) %>% 
  summarize(
    likely.lo = HDIofMCMC(certainly.likely.diff)[1],
    likely.mean = mean(certainly.likely.diff),
    likely.hi = HDIofMCMC(certainly.likely.diff)[2],
    unlikely.lo = HDIofMCMC(certainly.unlikely.diff)[1],
    unlikely.mean = mean(certainly.unlikely.diff),
    unlikely.hi = HDIofMCMC(certainly.unlikely.diff)[2]
    )
