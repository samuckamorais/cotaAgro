export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Bem-vindo!</h2>
          <p className="text-sm text-gray-600">Gerencie suas cotações agrícolas</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 hover:text-gray-800">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
