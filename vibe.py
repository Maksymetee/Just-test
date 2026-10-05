def convert_usd_to_uah():
    amount = float(input("Сколько долларов? "))
    rate = 45

    result = amount * rate

    print(f"{amount}$ = {result:.2f} грн")


print("Конвертер USD → UAH")
convert_usd_to_uah()