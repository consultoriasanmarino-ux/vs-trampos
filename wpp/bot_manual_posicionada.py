import time
import re
import pyautogui
import pyperclip
from supabase import create_client, Client

# --- CONFIGURAÇÕES DO SUPABASE ---
SUPABASE_URL = "https://bvtfassziymdsftkytmq.supabase.co"
SUPABASE_KEY = "sb_publishable_Qyp_63NubEeU7T0KnAC4tg_U7qz-o91"

# --- COORDENADAS FORNECIDAS PELO USUÁRIO ---
CAMPO_TEXTO = (1325, 524)
BOTAO_CHECK = (1383, 678)
# Posição do resultado (Logo abaixo do status do WhatsApp)
# Ajustado para 880 para descer da linha "Profile Picture" e pegar a linha "WhatsApp Status"
POSICAO_RESULTADO = (1383, 880) 

def update_status_in_supabase(supabase, cliente_id, original_tel, status_icon):
    """Atualiza o telefone no banco com o ícone ✅ ou ❌"""
    # Remove ícones antigos se existirem para não duplicar
    clean_tel = original_tel.replace("✅", "").replace("❌", "").strip()
    new_tel = f"{clean_tel} {status_icon}"
    
    try:
        # Agora marcamos wpp_checked como True para nunca mais consultar este lead no robô
        supabase.table("clientes").update({
            "telefone": new_tel,
            "wpp_checked": True
        }).eq("id", cliente_id).execute()
        print(f"[✓] Banco atualizado e MARCAR CHECK: {new_tel}")
    except Exception as e:
        print(f"[!] Erro ao atualizar Supabase: {e}")

# Configuração global de velocidade do PyAutoGUI (Ações mais rápidas)
pyautogui.PAUSE = 0.1 # Intervalo entre comandos reduzido

def check_number_manual(phone):
    """Processo de clique e digitação manual (PyAutoGUI) com tentativas OTIMIZADO"""
    print(f"[*] Processando: {phone}")
    
    for tentativa in range(1, 3): # Tenta até 2 vezes se falhar
        if tentativa > 1:
            print(f"[!] Tentativa {tentativa}... Recomeçando.")
            
        # 1. Atualizar a página (F5) para limpar estado anterior
        pyautogui.press('f5')
        time.sleep(4) # Espera carregar
        
        # 2. Clicar no campo de texto e limpar
        pyautogui.click(CAMPO_TEXTO)
        pyautogui.hotkey('ctrl', 'a')
        pyautogui.press('backspace')
        
        # 3. Digitar o número com +55 (Escreve instantaneamente)
        full_phone = f"+55{phone}"
        pyautogui.write(full_phone, interval=0.01)
        time.sleep(0.5)
        
        # 4. Clicar em Check Number
        pyautogui.click(BOTAO_CHECK)
        
        # 5. Capturar o resultado (Aguarda até 10 seg)
        print("[.] Aguardando resultado...")
        for _ in range(10):
            time.sleep(1)
            pyautogui.click(POSICAO_RESULTADO, clicks=3)
            pyautogui.hotkey('ctrl', 'c')
            time.sleep(0.2)
            
            resultado = pyperclip.paste().lower()
            if "not found" in resultado:
                print("[-] Resultado: Não tem WhatsApp.")
                return "❌"
            elif "found" in resultado:
                print("[+] Resultado: TEM WhatsApp!")
                return "✅"
            
        print(f"[-] Time-out na tentativa {tentativa}.")

    return None


def main():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("\n" + "="*50)
        print("   ROBÔ PYAUTOGUI - CHECKNUMBER.AI (MANUAL)")
        print("="*50)
        print("[!] DEIXE O CHROME EM TELA CHEIA NO MONITOR PRINCIPAL.")
        print("[!] O robô vai começar em 5 segundos... mude para o Chrome!")
        time.sleep(5)
        
        while True:
            # Busca 1 lead por vez baseado na nova coluna wpp_checked
            try:
                response = supabase.table("clientes").select("id, telefone")\
                    .eq("wpp_checked", False)\
                    .not_.is_("telefone", "null")\
                    .neq("telefone", "")\
                    .limit(1).execute()
                
                leads = response.data
            except Exception as e:
                print(f"[!] Erro ao buscar dados no Supabase: {e}")
                time.sleep(5)
                continue
            
            if not leads:
                print("[~] Sem números novos. Aguardando 10s...")
                time.sleep(10)
                continue

            for lead in leads:
                cliente_id = lead['id']
                tel_original = lead['telefone']
                
                if not tel_original:
                    # Se não tem telefone, marca como checado para não travar o robô
                    supabase.table("clientes").update({"wpp_checked": True}).eq("id", cliente_id).execute()
                    continue

                # Separa caso tenha múltiplos telefones (ex: "1199..., 1188...")
                lista_tels_sujos = [t.strip() for t in tel_original.split(',')]
                novos_tels_com_status = []
                
                print(f"[*] Lead {cliente_id}: Detectados {len(lista_tels_sujos)} números para conferir.")

                for tel_bruto in lista_tels_sujos:
                    # Remove ícones antigos caso o usuário esteja re-rodando
                    tel_so_numeros = "".join(filter(str.isdigit, tel_bruto))
                    
                    if not tel_so_numeros:
                        novos_tels_com_status.append(tel_bruto)
                        continue
                    
                    # Se o número já começa com 55, removemos para a função check_number_manual 
                    # adicionar o +55 padronizado dela
                    tel_para_consulta = tel_so_numeros
                    if tel_para_consulta.startswith('55'):
                        tel_para_consulta = tel_para_consulta[2:]

                    # Executa a tarefa manual (F5 -> digita -> clica -> copia)
                    status_icon = check_number_manual(tel_para_consulta)
                    
                    # --- LÓGICA DE REDUNDÂNCIA PARA BRASIL (9º Dígito) ---
                    # Se deu ❌ mas é um número de 11 dígitos, tenta a versão com 10 dígitos (sem o 9)
                    if status_icon == "❌" and len(tel_para_consulta) == 11:
                        print(f"[!] {tel_para_consulta} deu ❌. Tentando versão sem o 9...")
                        tel_sem_9 = f"{tel_para_consulta[:2]}{tel_para_consulta[3:]}"
                        status_icon = check_number_manual(tel_sem_9)
                    
                    if status_icon:
                        novos_tels_com_status.append(f"{tel_so_numeros} {status_icon}")
                    else:
                        novos_tels_com_status.append(tel_so_numeros) # Mantém sem ícone se falhar
                    
                    # Pausa rápida entre números do mesmo lead
                    time.sleep(1)

                # Atualiza o lead com TODOS os números processados e marca o Check
                tel_final = ", ".join(novos_tels_com_status)
                try:
                    supabase.table("clientes").update({
                        "telefone": tel_final,
                        "wpp_checked": True
                    }).eq("id", cliente_id).execute()
                    print(f"[✓] FICHA CONCLUÍDA: {tel_final}")
                except Exception as e:
                    print(f"[!] Erro ao salvar no banco: {e}")
                
                # Pausa entre leads diferentes
                time.sleep(2)

    except KeyboardInterrupt:
        print("\n[!] Robô parado.")

if __name__ == "__main__":
    main()
