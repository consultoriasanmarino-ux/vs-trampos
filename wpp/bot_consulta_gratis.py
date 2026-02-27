import time
import re
import os
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from supabase import create_client, Client

# --- CONFIGURAÇÕES DO SUPABASE ---
# Você pode pegar esses valores no arquivo .env.local do seu projeto vs-trampos
SUPABASE_URL = "https://bvtfassziymdsftkytmq.supabase.co"
SUPABASE_KEY = "sb_publishable_Qyp_63NubEeU7T0KnAC4tg_U7qz-o91"

# --- CONFIGURAÇÕES DO SITE DE CONSULTA ---
TARGET_URL = "https://checknumber.ai/en"

def setup_driver():
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # Descomente para rodar sem ver a janela
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Tenta usar o perfil padrão para manter o navegador "aquecido"
    # chrome_options.add_argument(f"--user-data-dir={os.path.expanduser('~')}\\AppData\\Local\\Google\\Chrome\\User Data")
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def check_whatsapp(driver, phone):
    """
    Realiza a consulta no CheckNumber.AI usando a técnica do F5 (Grátis)
    """
    try:
        print(f"[*] Consultando número: {phone}")
        driver.get(TARGET_URL)
        
        wait = WebDriverWait(driver, 20)
        
        # 1. Esperar o Captcha (Cloudflare Turnstile) carregar e dar sucesso sozinho
        print("[...] Aguardando Captcha (Turnstile) dar Sucesso...")
        try:
            # O usuário informou que o id="success" fica visível quando termina
            wait.until(EC.visibility_of_element_located((By.ID, "success")))
            print("[✓] Captcha Resolvido!")
        except:
            print("[!] Captcha demorou muito para carregar ou deu erro.")
            return None
        
        # 2. Preencher o campo de telefone
        # O site pede o formato completo com + (ex: +5541991526358)
        phone_with_plus = f"+{phone}" if not phone.startswith('+') else phone
        
        try:
            input_field = wait.until(EC.presence_of_element_located((By.ID, "number")))
            input_field.clear()
            input_field.send_keys(phone_with_plus)
            print(f"[>] Número inserido: {phone_with_plus}")
            
            # 3. Clicar no botão "Check Number"
            # O botão contém um span com o texto "Check Number"
            submit_btn = driver.find_element(By.XPATH, "//button[.//span[contains(text(), 'Check Number')]]")
            submit_btn.click()
            print("[>] Botão clicado. Aguardando resultado...")
        except Exception as e:
            print(f"[!] Erro ao interagir com campos: {e}")
            return None

        # 4. Esperar e Ler o resultado
        try:
            # O resultado aparece no span id="whatsappStatus"
            status_element = wait.until(EC.presence_of_element_located((By.ID, "whatsappStatus")))
            time.sleep(1) # Garantia para o texto atualizar
            result_text = status_element.text.lower()
            
            print(f"[=] Resultado do site: {status_element.text}")
            
            if "found" in result_text and "not" not in result_text:
                return "✅"
            elif "not found" in result_text:
                return "❌"
            else:
                return None # Indeterminado
        except:
            print("[!] Não foi possível ler o resultado final.")
            return None

    except Exception as e:
        print(f"[!] Erro geral no CheckNumber: {e}")
        return None

def main():
    try:
        # Configurar Supabase (os valores foram pegos do seu .env.local)
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        driver = setup_driver()
        
        print("\n" + "="*50)
        print("   ROBÔ CHECKNUMBER.AI - CONSULTA WHATSAPP GRÁTIS")
        print("="*50)
        print("[+] O script vai abrir o Chrome. Deixe a janela visível.")
        
        while True:
            # 1. Busca leads que tenham telefone mas ainda não foram validados
            # No Supabase o campo telefone pode conter "+55..." puro ou já com o ícone
            try:
                response = supabase.table("clientes").select("id, telefone")\
                    .ilike("telefone", "55%")\
                    .not_.ilike("telefone", "%✅%")\
                    .not_.ilike("telefone", "%❌%")\
                    .limit(10).execute()
                
                leads = response.data
            except Exception as e:
                print(f"[!] Erro ao buscar dados no Supabase: {e}")
                time.sleep(5)
                continue
            
            if not leads:
                print("[~] Nenhum lead novo para validar. Aguardando 15s...")
                time.sleep(15)
                continue

            for lead in leads:
                cliente_id = lead['id']
                telefones_str = lead['telefone']
                
                if not telefones_str: continue

                # Separa caso tenha múltiplos telefones
                lista_tels = [t.strip() for t in telefones_str.split(',')]
                novos_tels = []
                
                for tel in lista_tels:
                    # Remove tudo que não é número
                    tel_limpo = "".join(filter(str.isdigit, tel))
                    if not tel_limpo: continue
                    
                    # Certifica que tem o 55 no início
                    if not tel_limpo.startswith('55'):
                        tel_limpo = "55" + tel_limpo

                    # Realiza a consulta com a técnica do F5/Refresh
                    resultado = check_whatsapp(driver, tel_limpo)
                    
                    if resultado:
                        novos_tels.append(f"{tel} {resultado}")
                    else:
                        novos_tels.append(tel) # Se falhou, mantém o original

                # Atualiza no Supabase
                tel_final = ", ".join(novos_tels)
                try:
                    supabase.table("clientes").update({"telefone": tel_final}).eq("id", cliente_id).execute()
                    print(f"[✓] Banco atualizado para {cliente_id}: {tel_final}")
                except Exception as e:
                    print(f"[!] Erro ao salvar no banco: {e}")
                
                # Pausa entre leads
                time.sleep(3)

    except KeyboardInterrupt:
        print("\n[!] Robô parado pelo usuário.")
    except Exception as e:
        print(f"[!] Erro crítico no robô: {e}")
        time.sleep(5)
    finally:
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    main()
