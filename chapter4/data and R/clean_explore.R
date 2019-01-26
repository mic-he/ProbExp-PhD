### exploring participants' beliefs about the content of the urn, after observing <access,observation>
require(Rmisc)
require(dplyr)
require(reshape2)
require(ggplot2)
require(gridExtra)

xdata <- read.csv("raw_data.csv", sep = ";")

# how many single worker ids?
xdata$id %>% unique() %>% length()
# --> 104 workers

# did anybody select exactly 0 for every bin? 
nihilists=subset(xdata, xdata$bin0==0.00 & xdata$bin1==0.00 & xdata$bin2==0.00 & xdata$bin3==0.00 & xdata$bin4==0.00 & xdata$bin5==0.00 & xdata$bin6==0.00 & xdata$bin7==0.00 & xdata$bin8==0.00 & xdata$bin9==0.00 & xdata$bin10==0.00)
nihilists$id %>% unique() %>% length()

# and exaclty 1?
optimists=subset(xdata, xdata$bin0==1.00 & xdata$bin1==1.00 & xdata$bin2==1.00 & xdata$bin3==1.00 & xdata$bin4==1.00 & xdata$bin5==1.00 & xdata$bin6==1.00 & xdata$bin7==1.00 & xdata$bin8==1.00 & xdata$bin9==1.00 & xdata$bin10==1.00)
optimists$id %>% unique() %>% length()

# get rid of nihilists
xdata=droplevels(subset(xdata, !xdata$id %in% nihilists$id))
xdata$id %>% unique() %>% length()
# --> 101 workers left

# get rid of useless columns
xdata$itemTime<-xdata$RT<-NULL
cleandata <- xdata
colnames(cleandata) <- c("id","trial","condition","acc","obs",paste0("bin",0:10))
# save
write.csv(cleandata,"clean_data.csv", row.names = FALSE)

# normalize each participant's rating, then average across participants
bins = as.matrix(xdata[,grep("bin", names(xdata))])
norm.bins = prop.table(bins,1)
colnames(norm.bins) = paste0("nb", 0:10)
xdata = cbind(xdata,norm.bins)
means = ddply(xdata, .(value), colwise(mean, paste0("nb", 0:10) ))
means = as.data.frame(melt(means,"value"))
colnames(means)=c("value","bin","mean")
sds = ddply(xdata, .(value), colwise(sd, paste0("nb", 0:10) ))
sds = as.data.frame(melt(sds,"value"))
colnames(sds)=c("value","bin","sd")

# as data frame
df=cbind(means,sds$sd)
colnames(df)=c("value","bin","mean","sd")
df$sem=df$sd/length(levels(as.factor(sub("(.*?):.*", "\\1", xdata$id))))
colnames(df)=c("value","bin","mean","sd","sem")
df=arrange(df,value)
df$bin=rep(c(0:10),65)
write.csv(df,"observed_belief.csv",row.names = FALSE)

# warning: the plot is huge
plot <- ggplot(data=df, aes(x=as.factor(bin),y=mean))+
  geom_point(size=2)+
  facet_wrap(facets = ~value, scales = "free",ncol=13)+
  scale_y_continuous(limits = c(0,1), breaks=seq(0,1,0.1))+
  ggtitle("observed belief for each value")
show(plot)

