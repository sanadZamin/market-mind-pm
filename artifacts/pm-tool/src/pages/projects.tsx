import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListProjects, useCreateProject } from "@workspace/api-client-react";
import { getAuthRequest } from "@/lib/api-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FolderKanban, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

const COLORS = ["#13eac1", "#23a7e5", "#003d30", "#0db99a", "#10b981", "#f59e0b", "#ef4444"];

export default function Projects() {
  const { data: projects, isLoading } = useListProjects({ request: getAuthRequest() });
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const createMutation = useCreateProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "", color: COLORS[0] },
  });

  const onSubmit = async (data: CreateProjectForm) => {
    try {
      await createMutation.mutateAsync({ data, request: getAuthRequest() });
      toast({ title: "Project created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to create project" });
    }
  };

  const filteredProjects = projects?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage all your team's workspaces.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-9 bg-card border-border/50 rounded-xl h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl font-semibold gap-2 h-10 px-5 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input {...form.register("name")} className="bg-background" placeholder="e.g. Website Redesign" />
                    {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...form.register("description")} className="bg-background resize-none" placeholder="Brief description of the project..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Color</Label>
                    <div className="flex gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${form.watch('color') === color ? 'ring-2 ring-offset-2 ring-offset-card ring-primary scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => form.setValue("color", color)}
                        />
                      ))}
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending} className="rounded-xl">
                      {createMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-3xl border border-border/50 border-dashed">
            <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold text-foreground font-display">No projects found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Get started by creating a new project to organize your tasks and collaborate with your team.</p>
            <Button onClick={() => setIsDialogOpen(true)} className="mt-6 rounded-xl" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Create First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/projects/${project.id}`}>
                  <Card className="h-full border-border/50 bg-card hover:bg-secondary/40 transition-all cursor-pointer group shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300 flex flex-col">
                    <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold font-display leading-tight">{project.name}</h3>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                          {project.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                        {project.description || "No description."}
                      </p>
                      
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-sm">
                        <div className="flex items-center text-muted-foreground font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                          {project.completedTaskCount}/{project.taskCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
