'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderPlus, Edit, Trash2, ArrowLeft, TreePine } from 'lucide-react';

interface Project {
  id: number;
  project_number: string;
  name: string;
  location?: string;
  client?: string;
  trees_to_plant: number;
  trees_planted: number;
  sites_count?: number;
  trees_count?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      // Sprawdź czy data jest tablicą
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        console.error('API returned non-array data:', data);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć projekt "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Projekt został usunięty');
        loadProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Błąd podczas usuwania projektu');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Wystąpił błąd podczas usuwania projektu');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject({ ...project });
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProject),
      });

      if (response.ok) {
        alert('Projekt został zaktualizowany');
        setEditingProject(null);
        loadProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Błąd podczas aktualizacji projektu');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Wystąpił błąd podczas aktualizacji projektu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-white/50">Ładowanie projektów...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Powrót
          </Link>
          <Link href="/add-project" className="inline-flex items-center gap-2 font-bold text-sm text-white px-4 py-2 rounded-2xl transition-all hover:scale-105" style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',boxShadow:'0 4px 16px rgba(34,197,94,0.35)'}}>
            <FolderPlus className="w-4 h-4" /> Dodaj Projekt
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 gradient-border-green">
          <h1 className="text-2xl font-black text-gradient-green mb-6">Lista Projektów</h1>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nie masz jeszcze żadnych projektów
              </p>
              <Link
                href="/add-project"
                className="inline-flex items-center gap-2 bg-green-600 dark:bg-[#22c55e] text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-500"
              >
                <FolderPlus className="w-5 h-5" />
                Dodaj Pierwszy Projekt
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] font-black text-[#22c55e] px-2.5 py-1 rounded-xl" style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.2)'}}>
                          {project.project_number}
                        </span>
                        <h3 className="text-base font-bold text-white">{project.name}</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        {project.location && (
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Lokalizacja</p>
                            <p className="text-sm text-white/70">{project.location}</p>
                          </div>
                        )}
                        {project.client && (
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Klient</p>
                            <p className="text-sm text-white/70">{project.client}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Drzewa</p>
                          <p className="text-sm text-white/70 flex items-center gap-1.5">
                            <TreePine className="w-3.5 h-3.5 text-[#22c55e]" />
                            <span className="text-[#22c55e] font-bold">{project.trees_count || 0}</span> / {project.trees_to_plant}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-3 flex-shrink-0">
                      <button onClick={() => handleEdit(project)} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edytuj">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(project.id, project.name)} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Usuń">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass rounded-3xl gradient-border-green p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-gradient-green mb-5">Edytuj Projekt</h2>
            <div className="space-y-4">
              {[{label:'Numer Projektu',key:'project_number',type:'text'},{label:'Nazwa Projektu',key:'name',type:'text'},{label:'Lokalizacja',key:'location',type:'text'},{label:'Klient',key:'client',type:'text'}].map(({label,key,type})=>(
                <div key={key}>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={(editingProject as any)[key]||''} onChange={e=>setEditingProject({...editingProject,[key]:e.target.value} as any)} className="input-modern" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Ilość drzew</label>
                <input type="number" value={editingProject.trees_to_plant} onChange={e=>setEditingProject({...editingProject,trees_to_plant:parseInt(e.target.value)||0})} className="input-modern" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveEdit} className="btn-primary flex-1">Zapisz</button>
              <button onClick={()=>setEditingProject(null)} className="flex-1 glass rounded-2xl py-3 text-sm font-semibold text-white/60 hover:text-white transition-colors">Anuluj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
