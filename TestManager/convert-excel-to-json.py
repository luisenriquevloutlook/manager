"""
Script para convertir Matriz de Pruebas Excel a JSON
Convierte el archivo Excel de la matriz de pruebas al formato JSON requerido por el sistema
"""

import pandas as pd
import json
from datetime import datetime

def convert_excel_to_json(excel_path, output_path):
    """
    Convierte un archivo Excel de matriz de pruebas a JSON
    
    Args:
        excel_path: Ruta al archivo Excel
        output_path: Ruta donde se guardará el JSON
    """
    print(f"📖 Leyendo Excel: {excel_path}")
    
    # Leer el archivo Excel
    # Asumiendo que la primera hoja contiene los casos de prueba
    df = pd.read_excel(excel_path, sheet_name=0)
    
    print(f"✅ Encontradas {len(df)} filas")
    print(f"📋 Columnas: {', '.join(df.columns.tolist())}")
    
    test_cases = []
    
    # Mapeo de columnas (ajustar según tu Excel)
    # Ejemplo de estructura esperada:
    # Código | Módulo | Nombre | Descripción | Precondiciones | Pasos | Resultado Esperado | Prioridad | Estado | Asignado a | Tiempo | Tags
    
    for idx, row in df.iterrows():
        # Saltar filas vacías
        if pd.isna(row.get('Código', None)) or pd.isna(row.get('Nombre', None)):
            continue
        
        # Procesar pasos (pueden estar en una sola celda separados por saltos de línea)
        steps = []
        if not pd.isna(row.get('Pasos', '')):
            steps_text = str(row['Pasos'])
            steps = [s.strip() for s in steps_text.split('\n') if s.strip()]
        
        # Procesar tags (separados por comas)
        tags = []
        if not pd.isna(row.get('Tags', '')):
            tags_text = str(row['Tags'])
            tags = [t.strip() for t in tags_text.split(',') if t.strip()]
        
        test_case = {
            "id": f"tc-{row['Código'].lower().replace('-', '-')}",
            "code": str(row['Código']).strip(),
            "module": str(row.get('Módulo', 'GENERAL')).strip(),
            "name": str(row['Nombre']).strip(),
            "description": str(row.get('Descripción', '')).strip() if not pd.isna(row.get('Descripción')) else "",
            "preconditions": str(row.get('Precondiciones', '')).strip() if not pd.isna(row.get('Precondiciones')) else "",
            "steps": steps,
            "expectedResult": str(row.get('Resultado Esperado', '')).strip() if not pd.isna(row.get('Resultado Esperado')) else "",
            "priority": str(row.get('Prioridad', 'MEDIA')).strip().upper(),
            "status": str(row.get('Estado', 'PENDIENTE')).strip().upper(),
            "assignedTo": str(row.get('Asignado a', '')).strip() if not pd.isna(row.get('Asignado a')) else "",
            "estimatedTime": int(row.get('Tiempo (min)', 5)) if not pd.isna(row.get('Tiempo (min)')) else 5,
            "tags": tags,
            "createdAt": datetime.now().isoformat() + "Z",
            "updatedAt": datetime.now().isoformat() + "Z",
            "version": "1.1"
        }
        
        test_cases.append(test_case)
    
    # Estructura final
    data = {
        "testCases": test_cases,
        "executions": [],
        "exportedAt": datetime.now().isoformat() + "Z",
        "version": "1.1",
        "totalCases": len(test_cases)
    }
    
    # Guardar JSON
    print(f"\n💾 Guardando JSON: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Conversión exitosa!")
    print(f"📊 {len(test_cases)} casos de prueba convertidos")
    print(f"\n🎯 Ahora puedes importar '{output_path}' en el sistema de pruebas")

if __name__ == "__main__":
    # Rutas de archivos
    excel_file = r"C:\Users\luise\OneDrive\Desarrollo\MesaGo\Documentación\Matriz de Pruebas\Matriz de Pruebas MesaGo V1.1.xlsx"
    json_file = r"C:\Users\luise\OneDrive\Desarrollo\MesaGo\Documentación\Matriz de Pruebas\matriz-pruebas-import.json"
    
    print("=" * 60)
    print("🔄 CONVERSOR DE MATRIZ DE PRUEBAS EXCEL A JSON")
    print("=" * 60)
    print()
    
    try:
        convert_excel_to_json(excel_file, json_file)
        print("\n" + "=" * 60)
    except FileNotFoundError:
        print("❌ Error: No se encontró el archivo Excel")
        print(f"📁 Buscando en: {excel_file}")
        print("\n💡 Ajusta la ruta 'excel_file' en el script si está en otra ubicación")
    except Exception as e:
        print(f"❌ Error durante la conversión: {e}")
        print("\n💡 Verifica que:")
        print("   1. El archivo Excel exista")
        print("   2. Tengas instalado pandas y openpyxl: pip install pandas openpyxl")
        print("   3. Las columnas del Excel coincidan con lo esperado")
