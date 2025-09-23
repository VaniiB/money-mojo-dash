import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
          <span className="text-primary-foreground font-bold text-2xl">404</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Página no encontrada</h1>
          <p className="text-xl text-muted-foreground">No pudimos encontrar la página que estás buscando</p>
        </div>
        <a 
          href="/" 
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-primary text-primary-foreground font-medium rounded-lg shadow-medium hover:shadow-strong transition-all duration-200"
        >
          <span>Volver al Dashboard</span>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
