import { Layout } from "@/components/layout";
import { useListProjects } from "@workspace/api-client-react";
import { getAuthRequest } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Clock, Activity, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: projects, isLoading } = useListProjects({ request: getAuthRequest() });

  const stats = {
    totalProjects: projects?.length || 0,
    totalTasks: projects?.reduce((acc, p) => acc + p.taskCount, 0) || 0,
    completedTasks: projects?.reduce((acc, p) => acc + p.completedTaskCount, 0) || 0,
    activeProjects: projects?.filter(p => p.status === 'active').length || 0,
  };

  const progress = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening across your workspace.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Active Projects", value: stats.activeProjects, icon: Briefcase, color: "text-blue-400", bg: "bg-blue-400/10" },
            { label: "Total Tasks", value: stats.totalTasks, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
            { label: "Tasks Completed", value: stats.completedTasks, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Completion Rate", value: `${progress}%`, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-black/10 hover:border-border transition-all group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-foreground font-display tracking-tight">{stat.value}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display">Recent Projects</h2>
            <Link href="/projects" className="text-sm text-primary font-medium hover:underline flex items-center">
              View all <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-card/50 animate-pulse border border-border/50" />
              ))
            ) : projects?.slice(0, 6).map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.05) }}
              >
                <Link href={`/projects/${project.id}`}>
                  <Card className="h-full border-border/50 bg-card hover:bg-secondary/40 transition-all cursor-pointer group shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                        <CardTitle className="text-lg font-bold font-display group-hover:text-primary transition-colors">{project.name}</CardTitle>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wider">
                        {project.status}
                      </span>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
                        {project.description || "No description provided."}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span className="font-medium text-foreground">
                            {project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%`,
                              backgroundColor: project.color
                            }} 
                          />
                        </div>
                        <div className="flex justify-between text-xs pt-2">
                          <span className="text-muted-foreground">{project.completedTaskCount} / {project.taskCount} tasks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
