rates = {
    "USD": 45,
    "EUR": 52,
    "PLN": 12
}


def convert_currency(amount, currency, direction):
    rate = rates[currency]

    if direction == "1":
        result = amount * rate
        print(f"\n{amount:.2f} {currency} = {result:.2f} UAH")
    else:
        result = amount / rate
        print(f"\n{amount:.2f} UAH = {result:.2f} {currency}")


print("================================")
print("       КОНВЕРТЕР ВАЛЮТ")
print("================================")

while True:
    print("\nВыберите валюту:")
    print("1. USD - Доллар")
    print("2. EUR - Евро")
    print("3. PLN - Злотый")
    print("4. Выход")

    choice = input("\nВаш выбор: ")

    if choice == "4":
        print("\nДо свидания!")
        break

    currencies = {
        "1": "USD",
        "2": "EUR",
        "3": "PLN"
    }

    if choice not in currencies:
        print("Ошибка: такого варианта нет.")
        continue

    currency = currencies[choice]

    print(f"\nВы выбрали {currency}")
    print("1. Валюта → UAH")
    print("2. UAH → Валюта")

    direction = input("Выберите направление: ")

    if direction not in ["1", "2"]:
        print("Ошибка: выберите 1 или 2.")
        continue

    try:
        amount = float(input("Введите сумму: "))

        if amount < 0:
            print("Сумма не может быть отрицательной.")
            continue

        convert_currency(amount, currency, direction)

    except ValueError:
        print("Ошибка: введите число.")