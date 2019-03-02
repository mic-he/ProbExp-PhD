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
             "lambda",
             "theta.might",
             "theta.probably",
             "theta.certainly",
             "theta.possible",
             "theta.likely",
             'PPC.expression',
             'PPC.state',
             'PPC.value'
)

# jags model
model="jags_model.R"

# # command to get samples
j.samples = jags(data=dataList,
                 parameters.to.save = parameters,
                 model.file = model,
                 n.chains=2, n.iter=5000, # how many chain, how many iterations?
                 n.burnin=4000, n.thin=, DIC=T) # burn in, thinning values, compute DIC

save(j.samples, file = "j.samples.Rdata")
